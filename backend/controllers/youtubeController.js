const axios = require('axios');

// ─── GET /api/youtube/search?q=nombre+artista ─────────────────────────────────
// Busca el video más relevante en YouTube para una canción y devuelve el videoId
exports.searchVideo = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({ success: false, message: 'El parámetro q es requerido' });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'YOUTUBE_API_KEY no configurada' });
    }

    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: apiKey,
        q: `${q.trim()} official audio`,
        part: 'snippet',
        type: 'video',
        videoCategoryId: '10', // Categoría Música
        maxResults: 1,
        safeSearch: 'none',
      },
    });

    const items = response.data.items;

    if (!items || items.length === 0) {
      return res.status(404).json({ success: false, message: 'No se encontró el video en YouTube' });
    }

    const video = items[0];

    res.status(200).json({
      success: true,
      videoId: video.id.videoId,
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails?.medium?.url || null,
    });

  } catch (error) {
    console.error('❌ Error en YouTube searchVideo:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Error al buscar en YouTube',
      detail: error.response?.data || error.message,
    });
  }
};