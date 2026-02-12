const axios = require('axios');

// ─── Obtener Access Token de Spotify ─────────────────────────────────────────
const getSpotifyToken = async () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Faltan SPOTIFY_CLIENT_ID o SPOTIFY_CLIENT_SECRET en variables de entorno');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await axios.post(
    'https://accounts.spotify.com/api/token',
    new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return response.data.access_token;
};

// ─── Mapear track al formato que usa el frontend ──────────────────────────────
const mapTrack = (track) => ({
  id: track.id,
  name: track.name,
  artist: track.artists.map((a) => a.name).join(', '),
  album: track.album.name,
  albumImage: track.album.images[0]?.url || null,
  previewUrl: track.preview_url,
  spotifyUrl: track.external_urls.spotify,
  duration: track.duration_ms,
  popularity: track.popularity,
});

// ─── Construir URL manualmente para evitar problemas de serialización ─────────
const buildSpotifySearchUrl = (params) => {
  const url = new URL('https://api.spotify.com/v1/search');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });
  return url.toString();
};

// ─── GET /api/spotify/featured ────────────────────────────────────────────────
exports.getFeaturedTracks = async (req, res) => {
  try {
    const token = await getSpotifyToken();
    console.log('✅ Token obtenido correctamente');

    // Construimos la URL manualmente para garantizar que limit sea un número válido
    const searchUrl = buildSpotifySearchUrl({
      q: 'pop hits',
      type: 'track',
      limit: 20,
      market: 'US',
    });

    console.log('🔗 URL de búsqueda:', searchUrl);

    const response = await axios.get(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const allTracks = response.data.tracks.items.map(mapTrack);

    const withPreview = allTracks.filter((t) => t.previewUrl);
    const withoutPreview = allTracks.filter((t) => !t.previewUrl);

    console.log(`✅ Featured: ${withPreview.length} con preview, ${withoutPreview.length} sin preview`);

    res.status(200).json({
      success: true,
      tracks: [...withPreview, ...withoutPreview],
    });
  } catch (error) {
    console.error('❌ Error en getFeaturedTracks:', JSON.stringify(error.response?.data, null, 2) || error.message);
    console.error('❌ Status HTTP:', error.response?.status);
    res.status(500).json({
      success: false,
      message: 'Error al cargar canciones',
      detail: error.response?.data || error.message,
    });
  }
};

// ─── GET /api/spotify/search?q=...&limit=20 ──────────────────────────────────
exports.searchTracks = async (req, res) => {
  try {
    const { q, limit } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({ success: false, message: 'El parámetro q es requerido' });
    }

    // Validar y limpiar el límite
    const parsedLimit = parseInt(limit, 10);
    const safeLimit = !isNaN(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 50 ? parsedLimit : 20;

    const token = await getSpotifyToken();

    const searchUrl = buildSpotifySearchUrl({
      q: q.trim(),
      type: 'track',
      limit: safeLimit,
      market: 'US',
    });

    const response = await axios.get(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const allTracks = response.data.tracks.items.map(mapTrack);

    const withPreview = allTracks.filter((t) => t.previewUrl);
    const withoutPreview = allTracks.filter((t) => !t.previewUrl);

    console.log(`🔍 Búsqueda "${q}": ${withPreview.length} con preview de ${allTracks.length}`);

    res.status(200).json({
      success: true,
      tracks: [...withPreview, ...withoutPreview],
    });
  } catch (error) {
    console.error('❌ Error en searchTracks:', JSON.stringify(error.response?.data, null, 2) || error.message);
    res.status(500).json({
      success: false,
      message: 'Error al buscar canciones',
      detail: error.response?.data || error.message,
    });
  }
};

// ─── GET /api/spotify/track/:id ───────────────────────────────────────────────
exports.getTrackById = async (req, res) => {
  try {
    const { id } = req.params;
    const token = await getSpotifyToken();

    const response = await axios.get(
      `https://api.spotify.com/v1/tracks/${id}?market=US`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    res.status(200).json({ success: true, track: mapTrack(response.data) });
  } catch (error) {
    console.error('❌ Error en getTrackById:', JSON.stringify(error.response?.data, null, 2) || error.message);
    res.status(500).json({ success: false, message: 'Error al obtener la canción' });
  }
};