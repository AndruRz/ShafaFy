// models/ArtistGraph.js
const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
//  MODELO DE GRAFO DE ARTISTAS
//
//  Estructura:
//    - Cada documento representa UNA ARISTA del grafo
//    - Una arista conecta dos artistas (artistA ↔ artistB)
//    - El peso (weight) aumenta cada vez que ambos artistas aparecen
//      en el historial del mismo usuario
//    - Los usuarios que generaron la conexión se guardan para
//      poder hacer filtrado colaborativo entre usuarios
//
//  Ejemplo:
//    { artistA: "Bad Bunny", artistB: "J Balvin", weight: 15, users: [u1, u2, u3] }
//    Significa: 15 usuarios escucharon ambos artistas → fuerte conexión
// ─────────────────────────────────────────────────────────────────────────────

const artistGraphSchema = new mongoose.Schema({

  // ── Nodo A ─────────────────────────────────────────────────────────────────
  artistAId: {
    type:     String,
    required: true,
  },
  artistAName: {
    type:     String,
    required: true,
    trim:     true,
  },

  // ── Nodo B ─────────────────────────────────────────────────────────────────
  artistBId: {
    type:     String,
    required: true,
  },
  artistBName: {
    type:     String,
    required: true,
    trim:     true,
  },

  // ── Peso de la arista ──────────────────────────────────────────────────────
  // Cuántas veces esta conexión fue reforzada (más alto = más relacionados)
  weight: {
    type:    Number,
    default: 1,
  },

  // ── Tipo de conexión ───────────────────────────────────────────────────────
  // 'colistened'    → usuarios que escucharon ambos artistas
  // 'collaboration' → colaboración real en Spotify (feat, remix, etc.)
  connectionType: {
    type:    String,
    enum:    ['colistened', 'collaboration'],
    default: 'colistened',
  },

  // ── Usuarios que generaron esta conexión ──────────────────────────────────
  // Para filtrado colaborativo: "otros usuarios que escucharon A también escucharon B"
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref:  'User',
  }],

  // ── Fecha de última actualización ─────────────────────────────────────────
  updatedAt: {
    type:    Date,
    default: Date.now,
  },

});

// ── Índices ───────────────────────────────────────────────────────────────────
// Índice único: no puede haber dos aristas entre los mismos dos artistas
// Usamos un truco: siempre guardamos el de menor ID como artistAId
// para que (A→B) y (B→A) sean el mismo documento
artistGraphSchema.index(
  { artistAId: 1, artistBId: 1, connectionType: 1 },
  { unique: true }
);

// Para buscar todas las aristas de un artista (en ambas direcciones)
artistGraphSchema.index({ artistAId: 1, weight: -1 });
artistGraphSchema.index({ artistBId: 1, weight: -1 });

// Para buscar por tipo de conexión
artistGraphSchema.index({ connectionType: 1, weight: -1 });

module.exports = mongoose.model('ArtistGraph', artistGraphSchema);