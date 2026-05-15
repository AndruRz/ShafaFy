// controllers/trackRecommendationController.js
const TrackRecommendation = require('../models/TrackRecommendation');
const ArtistGraph         = require('../models/ArtistGraph');
const PlayHistory         = require('../models/PlayHistory');

// ─────────────────────────────────────────────────────────────────────────────
//  FUNCIÓN INTERNA — upsertTrack
//
//  Se llama desde historyController.registerPlay() cada vez que un usuario
//  escucha una canción. Alimenta el pool global de TrackRecommendation.
//
//  - Si la canción ya existe: incrementa playCount, añade el userId al array
//    users[] (sin duplicados) y recalcula userCount.
//  - Si no existe: la crea con ese usuario como primer oyente.
//
//  NO es una ruta HTTP — es una función interna exportada para ser importada
//  directamente por historyController.
// ─────────────────────────────────────────────────────────────────────────────
exports.upsertTrack = async (userId, trackData) => {
  const {
    trackId,
    trackName,
    artistId,
    artistName,
    albumName  = '',
    albumImage = '',
    genre      = 'unknown',
  } = trackData;

  if (!trackId || !artistId) return;

  // Primero hacemos el upsert básico
  await TrackRecommendation.findOneAndUpdate(
    { trackId },
    {
      $inc: { playCount: 1 },
      $set: {
        trackName,
        artistId,
        artistName,
        albumName,
        albumImage,
        genre,
        updatedAt: new Date(),
      },
      $addToSet: { users: userId }, // evita duplicados automáticamente
      $setOnInsert: { firstHeardAt: new Date() },
    },
    { upsert: true, new: true }
  );

  // Recalcular userCount desde el tamaño real del array
  // Lo hacemos con una actualización separada para que sea preciso
  await TrackRecommendation.updateOne(
    { trackId },
    [
      {
        $set: {
          userCount: { $size: '$users' },
        },
      },
    ]
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/recommendations/tracks
//
//  Algoritmo de recomendación colaborativa pura (solo tu BD):
//
//  1. Obtener mis artistas del historial del mes (top 10 por playCount)
//  2. Buscar en ArtistGraph los artistas conectados a los míos
//     (priorizando aristas con al menos 2 usuarios → señal colaborativa real)
//  3. Con los artistIds "vecinos", buscar en TrackRecommendation canciones
//     de esos artistas que YO no haya escuchado
//  4. Puntuar cada canción:
//       score = edgeWeight × userCount × log(playCount + 1)
//     (el peso del grafo amplifica la relevancia del artista,
//      userCount premia canciones populares en la comunidad)
//  5. Deduplicar, ordenar y devolver top 20 con reason explicativo
// ─────────────────────────────────────────────────────────────────────────────
exports.getRecommendedTracks = async (req, res) => {
  try {
    const now    = new Date();
    const userId = req.userId;

    // ── 1. Historial del usuario este mes ─────────────────────────────────────
    const myHistory = await PlayHistory.find({
      userId,
      month: now.getMonth(),
      year:  now.getFullYear(),
    })
      .sort({ playCount: -1 })
      .limit(10)
      .select('artistId artistName trackId');

    console.log('🎵 Mi historial:', myHistory.length, 'registros');
    console.log('🎵 Sample artistIds:', myHistory.slice(0,3).map(h => h.artistId));

    if (myHistory.length === 0) {
      return res.status(200).json({
        success: true,
        tracks:  [],
        message: 'Escucha más música para obtener recomendaciones personalizadas',
      });
    }

    const myArtistIds = new Set(myHistory.map(h => h.artistId));
    const myTrackIds  = new Set(myHistory.map(h => h.trackId));

    // ── 2. Buscar aristas del grafo relacionadas con mis artistas ─────────────
    const graphEdges = await ArtistGraph.find({
      $or: [
        { artistAId: { $in: [...myArtistIds] } },
        { artistBId: { $in: [...myArtistIds] } },
      ],
    })
      .sort({ weight: -1 })
      .limit(100)
      .lean();

    console.log('🔗 Aristas encontradas:', graphEdges.length);
    if (graphEdges.length > 0) {
      console.log('🔗 Sample arista:', graphEdges[0].artistAId, '↔', graphEdges[0].artistBId);
    }

    if (graphEdges.length === 0) {
      return res.status(200).json({
        success: true,
        tracks:  [],
        message: 'Aún no hay suficientes conexiones en el grafo. Sigue escuchando música.',
      });
    }

    // ── 3. Construir mapa de artistas vecinos ─────────────────────────────────
    const neighborMap = new Map();

    for (const edge of graphEdges) {
      const isA          = myArtistIds.has(edge.artistAId);
      const neighborId   = isA ? edge.artistBId   : edge.artistAId;
      const neighborName = isA ? edge.artistBName : edge.artistAName;
      const sourceName   = isA ? edge.artistAName : edge.artistBName;
      const edgeUsers    = edge.users?.length || 1;

      if (myArtistIds.has(neighborId)) continue;

      const existing = neighborMap.get(neighborId);
      if (existing) {
        existing.edgeWeight += edge.weight;
        existing.edgeUsers  += edgeUsers;
        if (edge.weight > existing.topEdgeWeight) {
          existing.topEdgeWeight = edge.weight;
          existing.sourceArtist  = sourceName;
        }
      } else {
        neighborMap.set(neighborId, {
          artistId:      neighborId,
          artistName:    neighborName,
          edgeWeight:    edge.weight,
          topEdgeWeight: edge.weight,
          edgeUsers,
          sourceArtist:  sourceName,
        });
      }
    }

    console.log('👥 Vecinos encontrados:', neighborMap.size);
    console.log('👥 Sample vecinos:', [...neighborMap.keys()].slice(0,3));

    if (neighborMap.size === 0) {
      return res.status(200).json({
        success: true,
        tracks:  [],
        message: 'No encontramos artistas nuevos para recomendarte todavía.',
      });
    }

    const neighborIds = [...neighborMap.keys()];

    // ── 4. Buscar canciones en el pool ────────────────────────────────────────
    // Sin filtro $ne userId — funciona aunque haya un solo usuario
    const candidateTracks = await TrackRecommendation.find({
      artistId:  { $in: neighborIds },
      trackId:   { $nin: [...myTrackIds] },
      userCount: { $gte: 1 },
    }).lean();

    console.log('🎶 Canciones candidatas:', candidateTracks.length);
    console.log('🎶 neighborIds buscados:', neighborIds.slice(0,5));
    if (candidateTracks.length > 0) {
      console.log('🎶 Sample canción:', candidateTracks[0].trackName, '| artistId:', candidateTracks[0].artistId);
    }

    if (candidateTracks.length === 0) {
      return res.status(200).json({
        success: true,
        tracks:  [],
        message: 'Los artistas relacionados aún no tienen canciones en el pool. Sigue escuchando.',
      });
    }

    // ── 5. Puntuar y ordenar ──────────────────────────────────────────────────
    const scored = candidateTracks.map(track => {
      const neighbor = neighborMap.get(track.artistId);
      const edgeW    = neighbor?.edgeWeight || 1;
      const score    = edgeW * track.userCount * Math.log2(track.playCount + 2);

      return {
        trackId:    track.trackId,
        trackName:  track.trackName,
        artistId:   track.artistId,
        artistName: track.artistName,
        albumName:  track.albumName,
        albumImage: track.albumImage,
        genre:      track.genre,
        userCount:  track.userCount,
        playCount:  track.playCount,
        score,
        reason: `Porque escuchas a ${neighbor?.sourceArtist || track.artistName}`,
      };
    });

    const unique = Array.from(
      new Map(
        scored
          .sort((a, b) => b.score - a.score)
          .map(t => [t.trackId, t])
      ).values()
    ).slice(0, 20);

    return res.status(200).json({
      success: true,
      total:   unique.length,
      tracks:  unique,
    });

  } catch (error) {
    console.error('❌ Error en getRecommendedTracks (collaborative):', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener canciones recomendadas',
      error:   error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/recommendations/pool-stats  (útil para debug / admin)
//
//  Muestra estadísticas del pool de canciones: cuántas canciones hay,
//  cuántos usuarios las alimentaron, top canciones más escuchadas.
// ─────────────────────────────────────────────────────────────────────────────
exports.getPoolStats = async (req, res) => {
  try {
    const totalTracks  = await TrackRecommendation.countDocuments();
    const totalPlays   = await TrackRecommendation.aggregate([
      { $group: { _id: null, total: { $sum: '$playCount' } } },
    ]);
    const topTracks    = await TrackRecommendation.find()
      .sort({ userCount: -1, playCount: -1 })
      .limit(10)
      .select('trackName artistName userCount playCount genre');

    res.status(200).json({
      success:    true,
      totalTracks,
      totalPlays: totalPlays[0]?.total || 0,
      topTracks,
    });
  } catch (error) {
    console.error('❌ Error en getPoolStats:', error.message);
    res.status(500).json({ success: false, message: 'Error al obtener stats del pool' });
  }
};