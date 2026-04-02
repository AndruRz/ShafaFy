const PlayHistory = require('../models/PlayHistory');
const graphCtrl   = require('./graphController');

// ─── POST /api/history/play ───────────────────────────────────────────────────
// Registra una reproducción. Si la canción ya fue escuchada este mes, incrementa
// el contador. Si no, crea un nuevo registro.
exports.registerPlay = async (req, res) => {
  try {
    const {
      trackId, trackName, artistName, artistId,
      albumName, albumImage, genre,
      allArtists = [], allArtistIds = [],
    } = req.body;

    if (!trackId || !trackName || !artistName || !artistId) {
      return res.status(400).json({
        success: false,
        message: 'trackId, trackName, artistName y artistId son requeridos',
      });
    }

    const now   = new Date();
    const month = now.getMonth();
    const year  = now.getFullYear();

    const record = await PlayHistory.findOneAndUpdate(
      { userId: req.userId, trackId, month, year },
      {
        $inc: { playCount: 1 },
        $set: {
          trackName,
          artistName,   // ya es solo el artista principal
          artistId,     // ya es solo su ID
          albumName:  albumName  || '',
          albumImage: albumImage || '',
          genre:      genre      || 'unknown',
          lastPlayedAt: now,
        },
        $setOnInsert: { month, year },
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Reproducción registrada',
      playCount: record.playCount,
    });

    // ── Actualizar grafo en background ────────────────────────────────────────
    // Construir lista limpia de { id, name } para cada artista de la canción
    const artistList = [];

    // Combinar allArtistIds y allArtists por posición
    const names = allArtists.length   > 0 ? allArtists   : [artistName];
    const ids   = allArtistIds.length > 0 ? allArtistIds : [artistId];

    for (let i = 0; i < names.length; i++) {
      const name = names[i]?.trim();
      const id   = (ids[i] || ids[0] || name)?.trim(); // fallback al primer id o al nombre
      if (name) artistList.push({ id, name });
    }

    if (artistList.length > 0) {
      graphCtrl.updateGraph(req.userId, artistList).catch(() => {});
    }

  } catch (error) {
    console.error('❌ Error en registerPlay:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar reproducción',
      error: error.message,
    });
  }
};

// ─── GET /api/history/top-tracks ─────────────────────────────────────────────
// Devuelve las 10 canciones más escuchadas por el usuario en el mes actual
exports.getTopTracks = async (req, res) => {
  try {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const topTracks = await PlayHistory.find({
      userId: req.userId,
      month,
      year
    })
      .sort({ playCount: -1 })
      .limit(10)
      .select('trackId trackName artistName artistId albumName albumImage genre playCount lastPlayedAt');

    res.status(200).json({
      success: true,
      month: month + 1, // Lo devolvemos en formato 1-12 para el frontend
      year,
      topTracks
    });

  } catch (error) {
    console.error('❌ Error en getTopTracks:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener top canciones',
      error: error.message
    });
  }
};

// ─── GET /api/history/top-artists ────────────────────────────────────────────
// Devuelve los 10 artistas más escuchados por el usuario en el mes actual
// Agrupa todas las canciones del mismo artista y suma sus reproducciones
exports.getTopArtists = async (req, res) => {
  try {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const topArtists = await PlayHistory.aggregate([
      // Filtrar por usuario y mes actual
      {
        $match: {
          userId: new (require('mongoose').Types.ObjectId)(req.userId),
          month,
          year
        }
      },
      // Agrupar por artista y sumar reproducciones
      {
        $group: {
          _id: '$artistId',
          artistName: { $first: '$artistName' },
          totalPlays: { $sum: '$playCount' },
          trackCount: { $sum: 1 } // Cuántas canciones distintas escuchó de ese artista
        }
      },
      // Ordenar por más escuchado
      {
        $sort: { totalPlays: -1 }
      },
      // Top 10
      {
        $limit: 10
      },
      // Dar forma al resultado
      {
        $project: {
          _id: 0,
          artistId: '$_id',
          artistName: 1,
          totalPlays: 1,
          trackCount: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      month: month + 1,
      year,
      topArtists
    });

  } catch (error) {
    console.error('❌ Error en getTopArtists:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener top artistas',
      error: error.message
    });
  }
};

// ─── GET /api/history/recent ─────────────────────────────────────────────────
// Últimas 20 canciones reproducidas (ordenadas por lastPlayedAt)
// Útil para mostrar "escuchado recientemente" en el perfil
exports.getRecentTracks = async (req, res) => {
  try {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const recentTracks = await PlayHistory.find({
      userId: req.userId,
      month,
      year
    })
      .sort({ lastPlayedAt: -1 })
      .limit(20)
      .select('trackId trackName artistName albumName albumImage playCount lastPlayedAt');

    res.status(200).json({
      success: true,
      recentTracks
    });

  } catch (error) {
    console.error('❌ Error en getRecentTracks:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener canciones recientes',
      error: error.message
    });
  }
};