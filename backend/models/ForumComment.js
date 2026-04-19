const mongoose = require('mongoose');

const forumCommentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ForumPost',
      required: true,
      index: true,
    },
    /** null = comentario raíz (hijo directo del post) */
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ForumComment',
      default: null,
      index: true,
    },
    content: {
      type: String,
      required: [true, 'El comentario es obligatorio'],
      trim: true,
      maxlength: [5000, 'El comentario es demasiado largo'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ForumComment', forumCommentSchema);
