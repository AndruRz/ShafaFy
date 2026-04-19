import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import authService from '../services/authService';
import forumService from '../services/forumService';
import { obtenerClienteSocketForo } from '../services/foroSocket';
import {
  comentarioExisteEnArbol,
  insertarComentarioEnArbol,
} from '../utils/foroArbol';
import CommentThread from '../components/forum/CommentThread';
import './css/Forum.css';

function ForumPostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const user = authService.getUser();
  const currentUserId = user?.id;

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const commentsRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rootComment, setRootComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyDeleteId, setBusyDeleteId] = useState(null);

  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await forumService.getPost(postId);
      setPost(data.post);
      const lista = data.comments || [];
      setComments(lista);
      commentsRef.current = lista;
    } catch {
      setError('No se pudo cargar la publicación.');
      setPost(null);
      setComments([]);
      commentsRef.current = [];
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  /** Inserta un comentario recién creado (API o socket) sin duplicar ni recargar todo el árbol. */
  const aplicarComentarioEntrante = useCallback((comment) => {
    const prev = commentsRef.current;
    if (comentarioExisteEnArbol(prev, comment.id)) return;
    const siguiente = insertarComentarioEnArbol(
      prev,
      { ...comment, replies: comment.replies?.length ? comment.replies : [] },
      comment.parentCommentId
    );
    commentsRef.current = siguiente;
    setComments(siguiente);
    setPost((p) => (p ? { ...p, commentCount: (p.commentCount ?? 0) + 1 } : p));
  }, []);

  useEffect(() => {
    const socket = obtenerClienteSocketForo();

    const unirseASala = () => {
      socket.emit('unirse_publicacion', postId);
    };

    socket.on('connect', unirseASala);
    unirseASala();

    const onPostActualizado = ({ post: nuevoPost }) => {
      if (!nuevoPost || nuevoPost.id !== postId) return;
      setPost(nuevoPost);
    };

    const onPostEliminado = ({ postId: eliminadoId }) => {
      if (eliminadoId === postId) {
        navigate('/foro', { replace: true });
      }
    };

    const onComentarioCreado = ({ postId: pid, comment }) => {
      if (pid !== postId || !comment?.id) return;
      aplicarComentarioEntrante(comment);
    };

    socket.on('post_actualizado', onPostActualizado);
    socket.on('post_eliminado', onPostEliminado);
    socket.on('comentario_creado', onComentarioCreado);

    return () => {
      socket.off('connect', unirseASala);
      socket.off('post_actualizado', onPostActualizado);
      socket.off('post_eliminado', onPostEliminado);
      socket.off('comentario_creado', onComentarioCreado);
      socket.emit('salir_publicacion', postId);
    };
  }, [postId, navigate, aplicarComentarioEntrante]);

  const isAuthor = useMemo(
    () => Boolean(post && currentUserId && post.author?.id === currentUserId),
    [post, currentUserId]
  );

  const handleDeletePost = async () => {
    if (!window.confirm('¿Eliminar esta publicación y todos sus comentarios?')) return;
    try {
      await forumService.deletePost(postId);
      navigate('/foro');
    } catch {
      setError('No se pudo eliminar la publicación.');
    }
  };

  const handleRootSubmit = async (e) => {
    e.preventDefault();
    const text = rootComment.trim();
    if (!text) return;
    try {
      setSubmitting(true);
      const data = await forumService.createComment(postId, { content: text });
      if (data.comment) aplicarComentarioEntrante(data.comment);
      setRootComment('');
    } catch {
      setError('No se pudo publicar el comentario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = useCallback(async (parentCommentId, text) => {
    try {
      setSubmitting(true);
      const data = await forumService.createComment(postId, {
        content: text,
        parentCommentId,
      });
      if (data.comment) aplicarComentarioEntrante(data.comment);
    } catch {
      setError('No se pudo publicar la respuesta.');
    } finally {
      setSubmitting(false);
    }
  }, [postId, aplicarComentarioEntrante]);

  const handleDeleteComment = useCallback(async (commentId) => {
    try {
      setBusyDeleteId(commentId);
      await forumService.deleteComment(commentId);
      await load();
    } catch {
      setError('No se pudo eliminar el comentario.');
    } finally {
      setBusyDeleteId(null);
    }
  }, [load]);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/auth');
  };

  if (loading && !post) {
    return (
      <div className="forum-page">
        <div className="forum-loading forum-loading--center">
          <div className="forum-spinner" />
          <p className="forum-muted">Cargando…</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="forum-page">
        <main className="forum-main forum-main--narrow">
          <p className="forum-alert forum-alert--error">{error || 'Publicación no encontrada.'}</p>
          <Link to="/foro" className="forum-link-btn">← Volver al foro</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="forum-page">
      <header className="forum-header">
        <div className="forum-header-row">
          <button type="button" className="forum-back-btn" onClick={() => navigate('/foro')}>
            ← Foro
          </button>
          <button type="button" className="forum-back-btn forum-back-btn--ghost" onClick={() => navigate('/reproductor')}>
            Reproductor
          </button>
          <div className="forum-header-user">
            <span className="forum-user-name">{user?.username}</span>
            <button type="button" className="logout-btn forum-logout" onClick={handleLogout}>
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="forum-main forum-main--narrow">
        <article className="forum-article">
          <h1 className="forum-article-title">{post.title}</h1>
          <div className="forum-article-meta">
            <span>{post.author?.fullName || post.author?.username}</span>
            <span>
              {post.updatedAt && post.createdAt && new Date(post.updatedAt) > new Date(post.createdAt)
                ? `Editado ${new Date(post.updatedAt).toLocaleString('es-ES')}`
                : `Publicado ${new Date(post.createdAt).toLocaleString('es-ES')}`}
            </span>
          </div>
          <div className="forum-article-body">{post.content}</div>

          {isAuthor && (
            <div className="forum-article-actions">
              <Link to={`/foro/editar/${postId}`} className="btn-musica forum-btn-inline">
                Editar
              </Link>
              <button type="button" className="forum-btn-danger" onClick={handleDeletePost}>
                Eliminar
              </button>
            </div>
          )}
        </article>

        {error && (
          <div className="forum-alert forum-alert--error">{error}</div>
        )}

        <section className="forum-comments-section">
          <h2 className="forum-section-title">Comentarios</h2>

          <form className="forum-root-comment-form" onSubmit={handleRootSubmit}>
            <label htmlFor="forum-root-comment" className="forum-label">
              Añadir comentario
            </label>
            <textarea
              id="forum-root-comment"
              className="forum-textarea"
              rows={4}
              value={rootComment}
              onChange={(e) => setRootComment(e.target.value)}
              placeholder="Escribe tu comentario…"
              disabled={submitting}
            />
            <button type="submit" className="btn-musica forum-btn-inline" disabled={submitting || !rootComment.trim()}>
              {submitting ? 'Publicando…' : 'Publicar comentario'}
            </button>
          </form>

          <CommentThread
            comments={comments}
            currentUserId={currentUserId}
            onReply={handleReply}
            onDelete={handleDeleteComment}
            busyId={busyDeleteId}
          />
        </section>
      </main>
    </div>
  );
}

export default ForumPostDetail;
