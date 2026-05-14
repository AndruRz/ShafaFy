// models/TrackRecommendation.js
const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
//  POOL GLOBAL DE CANCIONES RECOMENDABLES
//
//  Cada documento representa una canción que al menos un usuario escuchó.
//  Se alimenta automáticamente desde historyController cada vez que alguien
//  registra una reproducción.
//
//  La clave del sistema colaborativo:
//    - users[]   → quiénes la escucharon (para NO recomendarla a quien ya la oyó)
//    - userCount → cuántos usuarios distintos la escucharon (popularidad interna)
//    - playCount → suma total de reproducciones de todos los usuarios
//
//  Con esto, cuando el grafo dice "artista B está relacionado con artista A",
//  buscamos aquí las canciones de B que otros escucharon y las recomendamos
//  a quienes escuchan A (excluyendo al propio usuario del array users[]).
// ─────────────────────────────────────────────────────────────────────────────

const trackRecommendationSchema = new mongoose.Schema({

  // ── Identificación de la canción ───────────────────────────────────────────
  trackId: {
    type:     String,
    required: true,
  },
  trackName: {
    type:     String,
    required: true,
    trim:     true,
  },

  // ── Artista principal ──────────────────────────────────────────────────────
  artistId: {
    type:     String,
    required: true,
  },
  artistName: {
    type:     String,
    required: true,
    trim:     true,
  },

  // ── Metadata del álbum ─────────────────────────────────────────────────────
  albumName: {
    type:    String,
    default: '',
    trim:    true,
  },
  albumImage: {
    type:    String,
    default: '',
  },
  genre: {
    type:    String,
    default: 'unknown',
  },

  // ── Métricas de popularidad interna ───────────────────────────────────────
  // playCount: suma total de veces que fue reproducida por cualquier usuario
  playCount: {
    type:    Number,
    default: 1,
  },
  // userCount: cuántos usuarios DISTINTOS la escucharon (se recalcula del array users)
  userCount: {
    type:    Number,
    default: 1,
  },

  // ── Usuarios que la escucharon ────────────────────────────────────────────
  // Clave para el filtrado colaborativo:
  // Al recomendar, excluimos al usuario que ya la tiene en este array
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref:  'User',
  }],

  // ── Timestamps ─────────────────────────────────────────────────────────────
  firstHeardAt: {
    type:    Date,
    default: Date.now,
  },
  updatedAt: {
    type:    Date,
    default: Date.now,
  },

});

// ── Índices ───────────────────────────────────────────────────────────────────

// Único: una canción aparece una sola vez en el pool global
trackRecommendationSchema.index(
  { trackId: 1 },
  { unique: true }
);

// Para buscar canciones por artista y ordenar por popularidad
trackRecommendationSchema.index({ artistId: 1, userCount: -1 });
trackRecommendationSchema.index({ artistId: 1, playCount: -1 });

// Para queries de múltiples artistas a la vez
trackRecommendationSchema.index({ artistId: 1 });

module.exports = mongoose.model('TrackRecommendation', trackRecommendationSchema);