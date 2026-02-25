const Favorite = require('../models/Favorite');

// ─── POST /api/favorites/toggle ───────────────────────────────────────────────
// Si la canción ya está en favoritos → la elimina (unfavorite)
// Si no está → la agrega (favorite)
// Siempre devuelve { isFavorite: bool } para que el frontend actualice el corazón
exports.toggle = async (req, res) => {
  try {
    const { trackId, trackName, artistName, artistId, albumName, albumImage, genre } = req.body;

    if (!trackId || !trackName || !artistName || !artistId) {
      return res.status(400).json({
        success: false,
        message: 'trackId, trackName, artistName y artistId son requeridos'
      });
    }

    // Verificar si ya existe
    const existing = await Favorite.findOne({ userId: req.userId, trackId });

    if (existing) {
      // Ya es favorito → eliminar
      await Favorite.deleteOne({ _id: existing._id });
      return res.status(200).json({
        success: true,
        isFavorite: false,
        message: 'Eliminado de favoritos'
      });
    }

    // No existe → crear
    await Favorite.create({
      userId:     req.userId,
      trackId,
      trackName,
      artistName,
      artistId,
      albumName:  albumName  || '',
      albumImage: albumImage || '',
      genre:      genre      || 'unknown',
      savedAt:    new Date()
    });

    return res.status(201).json({
      success: true,
      isFavorite: true,
      message: 'Agregado a favoritos'
    });

  } catch (error) {
    console.error('❌ Error en favorites toggle:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar favoritos',
      error: error.message
    });
  }
};

// ─── GET /api/favorites ───────────────────────────────────────────────────────
// Devuelve todas las canciones favoritas del usuario
// Ordenadas por savedAt DESC (más recientes primero)
exports.getFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.userId })
      .sort({ savedAt: -1 })
      .select('-__v -userId');

    res.status(200).json({
      success: true,
      total: favorites.length,
      favorites
    });

  } catch (error) {
    console.error('❌ Error en getFavorites:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener favoritos',
      error: error.message
    });
  }
};

// ─── GET /api/favorites/check/:trackId ───────────────────────────────────────
// Verifica si una canción específica está en favoritos
// Útil para pintar el corazón al cargar/cambiar de canción
exports.checkFavorite = async (req, res) => {
  try {
    const { trackId } = req.params;

    const exists = await Favorite.findOne({ userId: req.userId, trackId });

    res.status(200).json({
      success: true,
      isFavorite: !!exists,
      savedAt: exists ? exists.savedAt : null
    });

  } catch (error) {
    console.error('❌ Error en checkFavorite:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar favorito',
      error: error.message
    });
  }
};