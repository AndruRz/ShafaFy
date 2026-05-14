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

    if (myHistory.length === 0) {
      return res.status(200).json({
        success: true,
        tracks:  [],
        message: 'Escucha más música para obtener recomendaciones personalizadas',
      });
    }

    const myArtistIds   = new Set(myHistory.map(h => h.artistId));
    const myTrackIds    = new Set(myHistory.map(h => h.trackId));

    // ── 2. Buscar aristas del grafo relacionadas con mis artistas ─────────────
    //    Priorizamos aristas con señal colaborativa (users.length >= 2)
    //    pero también incluimos las que tienen solo 1 usuario para no quedarnos sin datos
    const graphEdges = await ArtistGraph.find({
      $or: [
        { artistAId: { $in: [...myArtistIds] } },
        { artistBId: { $in: [...myArtistIds] } },
      ],
    })
      .sort({ weight: -1 })
      .limit(100)
      .lean();

    if (graphEdges.length === 0) {
      return res.status(200).json({
        success: true,
        tracks:  [],
        message: 'Aún no hay suficientes conexiones en el grafo. Sigue escuchando música.',
      });
    }

    // ── 3. Construir mapa de artistas vecinos ─────────────────────────────────
    //    artistId → { artistId, artistName, edgeWeight, sourceArtistName, userCount }
    //
    //    "source" = el artista MÍO que genera la conexión
    //    Acumulamos el peso si un artista vecino aparece en múltiples aristas
    const neighborMap = new Map();

    for (const edge of graphEdges) {
      const isA          = myArtistIds.has(edge.artistAId);
      const neighborId   = isA ? edge.artistBId   : edge.artistAId;
      const neighborName = isA ? edge.artistBName : edge.artistAName;
      const sourceName   = isA ? edge.artistAName : edge.artistBName;
      const edgeUsers    = edge.users?.length || 1;

      // Excluir artistas que el usuario ya escucha
      if (myArtistIds.has(neighborId)) continue;

      const existing = neighborMap.get(neighborId);
      if (existing) {
        existing.edgeWeight += edge.weight;
        existing.edgeUsers  += edgeUsers;
        // Conservar la fuente con mayor peso (la más relevante para el reason)
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

    if (neighborMap.size === 0) {
      return res.status(200).json({
        success: true,
        tracks:  [],
        message: 'No encontramos artistas nuevos para recomendarte todavía.',
      });
    }

    const neighborIds = [...neighborMap.keys()];

    // ── 4. Buscar canciones en el pool de TrackRecommendation ─────────────────
    //    - De los artistas vecinos identificados en el grafo
    //    - Que el usuario actual NO haya escuchado (no está en users[])
    //    - Que al menos 1 otro usuario las haya escuchado
    const candidateTracks = await TrackRecommendation.find({
      artistId:  { $in: neighborIds },
      trackId:   { $nin: [...myTrackIds] },   // no la ha escuchado
      users:     { $ne: userId },              // doble check: no está en el array
      userCount: { $gte: 1 },
    })
      .lean();

    if (candidateTracks.length === 0) {
      return res.status(200).json({
        success: true,
        tracks:  [],
        message: 'Los artistas relacionados aún no tienen canciones en el pool. Sigue escuchando.',
      });
    }

    // ── 5. Puntuar y ordenar las canciones ─────────────────────────────────────
    //
    //    score = edgeWeight × userCount × log2(playCount + 2)
    //
    //    - edgeWeight:  qué tan fuerte es la conexión en el grafo
    //    - userCount:   cuántos usuarios de la app escucharon esta canción
    //    - log(playCount): bonus logarítmico por reproducciones (evita que
    //      una canción con 1000 plays pero 1 usuario solo domine el ranking)
    const scored = candidateTracks.map(track => {
      const neighbor = neighborMap.get(track.artistId);
      const edgeW    = neighbor?.edgeWeight    || 1;
      const score    = edgeW * track.userCount * Math.log2(track.playCount + 2);

      return {
        trackId:      track.trackId,
        trackName:    track.trackName,
        artistId:     track.artistId,
        artistName:   track.artistName,
        albumName:    track.albumName,
        albumImage:   track.albumImage,
        genre:        track.genre,
        userCount:    track.userCount,
        playCount:    track.playCount,
        score,
        reason: `Porque escuchas a ${neighbor?.sourceArtist || track.artistName}`,
      };
    });

    // Ordenar por score DESC, deduplicar por trackId y limitar a 20
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