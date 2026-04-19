const mongoose = require('mongoose');
const ForumPost = require('../models/ForumPost');
const ForumComment = require('../models/ForumComment');
const foroRealtime = require('../services/foroRealtime');

const AUTHOR_FIELDS = 'username fullName';

function serializeUser(u) {
  if (!u) return null;
  const id = u._id ? u._id : u;
  return {
    id: id.toString(),
    username: u.username ?? '',
    fullName: u.fullName ?? '',
  };
}

function serializePost(doc, commentCount = 0) {
  const author = doc.author && typeof doc.author === 'object'
    ? serializeUser(doc.author)
    : null;
  return {
    id: doc._id.toString(),
    title: doc.title,
    content: doc.content,
    author,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    commentCount,
  };
}

/**
 * Árbol de comentarios: lista plana desde Mongo → nodos con array `replies`.
 * Cada post es la raíz conceptual; los comentarios de primer nivel tienen parentCommentId null.
 */
function buildCommentTree(commentDocs) {
  const map = {};

  commentDocs.forEach((c) => {
    const id = c._id.toString();
    map[id] = {
      id,
      postId: c.post.toString(),
      parentCommentId: c.parentCommentId ? c.parentCommentId.toString() : null,
      content: c.content,
      author: serializeUser(c.author),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      replies: [],
    };
  });

  const roots = [];

  commentDocs.forEach((c) => {
    const id = c._id.toString();
    const node = map[id];
    if (c.parentCommentId) {
      const pid = c.parentCommentId.toString();
      if (map[pid]) map[pid].replies.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortRecursive = (nodes) => {
    nodes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    nodes.forEach((n) => sortRecursive(n.replies));
  };
  sortRecursive(roots);

  return roots;
}

async function collectDescendantsIds(rootId) {
  const ids = [];
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift();
    ids.push(id);
    const children = await ForumComment.find({ parentCommentId: id }).select('_id').lean();
    children.forEach((ch) => queue.push(ch._id));
  }
  return ids;
}

exports.listPosts = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    let filter = {};
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter = {
        $or: [
          { title: new RegExp(safe, 'i') },
          { content: new RegExp(safe, 'i') },
        ],
      };
    }

    const posts = await ForumPost.find(filter)
      .populate('author', AUTHOR_FIELDS)
      .sort({ createdAt: -1 })
      .lean();

    const postsOut = await Promise.all(
      posts.map(async (p) => {
        const commentCount = await ForumComment.countDocuments({ post: p._id });
        return serializePost(p, commentCount);
      })
    );

    res.json({ success: true, posts: postsOut });
  } catch (error) {
    console.error('listPosts', error);
    res.status(500).json({ success: false, message: 'Error al listar publicaciones' });
  }
};

exports.getPost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const post = await ForumPost.findById(id).populate('author', AUTHOR_FIELDS).lean();
    if (!post) {
      return res.status(404).json({ success: false, message: 'Publicación no encontrada' });
    }

    const flat = await ForumComment.find({ post: post._id })
      .populate('author', AUTHOR_FIELDS)
      .sort({ createdAt: 1 })
      .lean();

    const comments = buildCommentTree(flat);

    res.json({
      success: true,
      post: serializePost(post, flat.length),
      comments,
    });
  } catch (error) {
    console.error('getPost', error);
    res.status(500).json({ success: false, message: 'Error al cargar la publicación' });
  }
};

exports.createPost = async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Título y contenido son obligatorios',
      });
    }

    const post = await ForumPost.create({
      title: title.trim(),
      content: content.trim(),
      author: req.userId,
    });

    const populated = await ForumPost.findById(post._id).populate('author', AUTHOR_FIELDS).lean();
    const serializado = serializePost(populated, 0);
    foroRealtime.emitirPostCreado({ post: serializado });
    res.status(201).json({
      success: true,
      post: serializado,
    });
  } catch (error) {
    console.error('createPost', error);
    res.status(500).json({ success: false, message: 'Error al crear la publicación' });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const { title, content } = req.body;
    const post = await ForumPost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Publicación no encontrada' });
    }
    if (post.author.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Solo puedes editar tus propias publicaciones' });
    }

    if (title != null) post.title = String(title).trim();
    if (content != null) post.content = String(content).trim();
    await post.save();

    const populated = await ForumPost.findById(post._id).populate('author', AUTHOR_FIELDS).lean();
    const commentCount = await ForumComment.countDocuments({ post: post._id });
    const serializado = serializePost(populated, commentCount);
    foroRealtime.emitirPostActualizado({ post: serializado });
    res.json({
      success: true,
      post: serializado,
    });
  } catch (error) {
    console.error('updatePost', error);
    res.status(500).json({ success: false, message: 'Error al actualizar la publicación' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const post = await ForumPost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Publicación no encontrada' });
    }
    if (post.author.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Solo puedes eliminar tus propias publicaciones' });
    }

    await ForumComment.deleteMany({ post: post._id });
    await post.deleteOne();

    foroRealtime.emitirPostEliminado({ postId: id });

    res.json({ success: true, message: 'Publicación eliminada' });
  } catch (error) {
    console.error('deletePost', error);
    res.status(500).json({ success: false, message: 'Error al eliminar la publicación' });
  }
};

exports.createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, message: 'ID de publicación inválido' });
    }

    const { content, parentCommentId } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'El comentario no puede estar vacío' });
    }

    const post = await ForumPost.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Publicación no encontrada' });
    }

    let parentId = null;
    if (parentCommentId) {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return res.status(400).json({ success: false, message: 'Comentario padre inválido' });
      }
      const parent = await ForumComment.findById(parentCommentId);
      if (!parent || parent.post.toString() !== post._id.toString()) {
        return res.status(400).json({ success: false, message: 'El comentario padre no pertenece a esta publicación' });
      }
      parentId = parent._id;
    }

    const comment = await ForumComment.create({
      post: post._id,
      parentCommentId: parentId,
      content: content.trim(),
      author: req.userId,
    });

    const populated = await ForumComment.findById(comment._id).populate('author', AUTHOR_FIELDS).lean();
    const node = {
      id: populated._id.toString(),
      postId: populated.post.toString(),
      parentCommentId: populated.parentCommentId ? populated.parentCommentId.toString() : null,
      content: populated.content,
      author: serializeUser(populated.author),
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt,
      replies: [],
    };

    foroRealtime.emitirComentarioCreado(post._id.toString(), { postId: post._id.toString(), comment: node });

    res.status(201).json({ success: true, comment: node });
  } catch (error) {
    console.error('createComment', error);
    res.status(500).json({ success: false, message: 'Error al publicar el comentario' });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const comment = await ForumComment.findById(id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comentario no encontrado' });
    }
    if (comment.author.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Solo puedes eliminar tus propios comentarios' });
    }

    const toDelete = await collectDescendantsIds(comment._id);
    await ForumComment.deleteMany({ _id: { $in: toDelete } });

    res.json({
      success: true,
      message: 'Comentario eliminado',
      deletedIds: toDelete.map((x) => x.toString()),
    });
  } catch (error) {
    console.error('deleteComment', error);
    res.status(500).json({ success: false, message: 'Error al eliminar el comentario' });
  }
};
