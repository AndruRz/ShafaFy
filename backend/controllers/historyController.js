// controllers/historyController.js
const PlayHistory = require('../models/PlayHistory');
const graphCtrl   = require('./graphController');
const recCtrl     = require('./trackRecommendationController'); // ← NUEVO

// ─── POST /api/history/play ───────────────────────────────────────────────────
// Registra una reproducción. Guarda solo el artista PRINCIPAL (primero del string).
// Pasa la lista completa de artistas al graphController para construir las aristas.
// También alimenta el pool de TrackRecommendation para el sistema colaborativo.
exports.registerPlay = async (req, res) => {
  try {
    const {
      trackId, trackName, artistName, artistId,
      albumName, albumImage, genre,
      allArtists   = [],
      allArtistIds = [],
    } = req.body;

    // Validar campos obligatorios
    if (!trackId || !trackName || !artistName || !artistId) {
      return res.status(400).json({
        success: false,
        message: 'trackId, trackName, artistName y artistId son requeridos',
      });
    }

    const now   = new Date();
    const month = now.getMonth(); // 0-11
    const year  = now.getFullYear();

    // Upsert: si existe incrementa playCount, si no lo crea
    const record = await PlayHistory.findOneAndUpdate(
      { userId: req.userId, trackId, month, year },
      {
        $inc: { playCount: 1 },
        $set: {
          trackName,
          artistName,
          artistId,
          albumName:   albumName  || '',
          albumImage:  albumImage || '',
          genre:       genre      || 'unknown',
          lastPlayedAt: now,
        },
        $setOnInsert: { month, year },
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success:   true,
      message:   'Reproducción registrada',
      playCount: record.playCount,
    });

    // ── Tareas en background (no bloquean la respuesta) ───────────────────────

    // 1. Actualizar grafo de artistas
    const names = allArtists.length   > 0 ? allArtists   : [artistName];
    const ids   = allArtistIds.length > 0 ? allArtistIds : [artistId];

    const artistList = [];
    for (let i = 0; i < names.length; i++) {
      const name = names[i]?.trim();
      const id   = (ids[i] || ids[0] || name)?.trim();
      if (name && id) artistList.push({ id, name });
    }

    if (artistList.length > 0) {
      graphCtrl.updateGraph(req.userId, artistList).catch(() => {});
    }

    // 2. Alimentar el pool de canciones recomendables ← NUEVO
    // Guardamos la canción con el artista PRINCIPAL (igual que PlayHistory)
    // para que el sistema colaborativo pueda encontrarla via ArtistGraph
    recCtrl.upsertTrack(req.userId, {
      trackId,
      trackName,
      artistId,
      artistName,
      albumName:  albumName  || '',
      albumImage: albumImage || '',
      genre:      genre      || 'unknown',
    }).catch(() => {});

  } catch (error) {
    console.error('❌ Error en registerPlay:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar reproducción',
      error:   error.message,
    });
  }
};

// ─── GET /api/history/top-tracks ─────────────────────────────────────────────
// Devuelve las 10 canciones más escuchadas por el usuario en el mes actual
exports.getTopTracks = async (req, res) => {
  try {
    const now   = new Date();
    const month = now.getMonth();
    const year  = now.getFullYear();

    const topTracks = await PlayHistory.find({ userId: req.userId, month, year })
      .sort({ playCount: -1 })
      .limit(10)
      .select('trackId trackName artistName artistId albumName albumImage genre playCount lastPlayedAt');

    res.status(200).json({
      success: true,
      month:   month + 1, // 1-12 para el frontend
      year,
      topTracks,
    });

  } catch (error) {
    console.error('❌ Error en getTopTracks:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener top canciones',
      error:   error.message,
    });
  }
};

// ─── GET /api/history/top-artists ────────────────────────────────────────────
// Agrupa por artistId (ya limpio = solo artista principal) y suma reproducciones.
exports.getTopArtists = async (req, res) => {
  try {
    const now   = new Date();
    const month = now.getMonth();
    const year  = now.getFullYear();

    const topArtists = await PlayHistory.aggregate([
      {
        $match: {
          userId: new (require('mongoose').Types.ObjectId)(req.userId),
          month,
          year,
        },
      },
      {
        $group: {
          _id:        '$artistId',
          artistName: { $first: '$artistName' },
          totalPlays: { $sum: '$playCount' },
          trackCount: { $sum: 1 },
        },
      },
      { $sort: { totalPlays: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id:        0,
          artistId:   '$_id',
          artistName: 1,
          totalPlays: 1,
          trackCount: 1,
        },
      },
    ]);

    res.status(200).json({
      success:    true,
      month:      month + 1,
      year,
      topArtists,
    });

  } catch (error) {
    console.error('❌ Error en getTopArtists:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener top artistas',
      error:   error.message,
    });
  }
};

// ─── GET /api/history/recent ─────────────────────────────────────────────────
// Últimas 20 canciones reproducidas (ordenadas por lastPlayedAt)
exports.getRecentTracks = async (req, res) => {
  try {
    const now   = new Date();
    const month = now.getMonth();
    const year  = now.getFullYear();

    const recentTracks = await PlayHistory.find({ userId: req.userId, month, year })
      .sort({ lastPlayedAt: -1 })
      .limit(20)
      .select('trackId trackName artistName albumName albumImage playCount lastPlayedAt');

    res.status(200).json({ success: true, recentTracks });

  } catch (error) {
    console.error('❌ Error en getRecentTracks:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener canciones recientes',
      error:   error.message,
    });
  }
};