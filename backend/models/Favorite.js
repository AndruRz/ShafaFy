const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trackId: {
    type: String,
    required: true
  },
  trackName: {
    type: String,
    required: true,
    trim: true
  },
  artistName: {
    type: String,
    required: true,
    trim: true
  },
  artistId: {
    type: String,
    required: true
  },
  albumName: {
    type: String,
    default: '',
    trim: true
  },
  albumImage: {
    type: String,
    default: ''
  },
  genre: {
    type: String,
    default: 'unknown'
  },
  savedAt: {
    type: Date,
    default: Date.now
  }
});

// Índice único: un usuario no puede tener la misma canción dos veces
favoriteSchema.index({ userId: 1, trackId: 1 }, { unique: true });

// Índice para ordenar por más reciente
favoriteSchema.index({ userId: 1, savedAt: -1 });

module.exports = mongoose.model('Favorite', favoriteSchema);