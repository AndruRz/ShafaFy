const mongoose = require('mongoose');

const playHistorySchema = new mongoose.Schema({
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
    trim: true,
    default: ''
  },
  albumImage: {
    type: String,
    default: ''
  },
  genre: {
    type: String,
    default: 'unknown'
  },
  playCount: {
    type: Number,
    default: 1
  },
  lastPlayedAt: {
    type: Date,
    default: Date.now
  },
  month: {
    type: Number, // 0-11 (igual que Date.getMonth())
    required: true
  },
  year: {
    type: Number,
    required: true
  }
});

// Índice único para evitar duplicados por usuario/canción/mes/año
playHistorySchema.index(
  { userId: 1, trackId: 1, month: 1, year: 1 },
  { unique: true }
);

// Índice para acelerar consultas de top tracks y top artists
playHistorySchema.index({ userId: 1, month: 1, year: 1, playCount: -1 });

module.exports = mongoose.model('PlayHistory', playHistorySchema);