const mongoose = require('mongoose');

const forumPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'El título es obligatorio'],
      trim: true,
      maxlength: [200, 'El título es demasiado largo'],
    },
    content: {
      type: String,
      required: [true, 'El contenido es obligatorio'],
      trim: true,
      maxlength: [20000, 'El contenido es demasiado largo'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

forumPostSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ForumPost', forumPostSchema);
