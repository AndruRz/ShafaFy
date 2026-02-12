const axios = require('axios');

// ─── Caché simple en memoria ──────────────────────────────────────────────────
const cache = {
  token: null,
  tokenExpiry: null,
  featuredTracks: null,
  featuredExpiry: null,
};

// ─── Obtener Access Token de Spotify (con caché) ──────────────────────────────
const getSpotifyToken = async () => {
  const now = Date.now();

  // Si el token existe y todavía es válido (con 1 min de margen), reutilízalo
  if (cache.token && cache.tokenExpiry && now < cache.tokenExpiry) {
    console.log('🔑 Token desde caché');
    return cache.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Faltan SPOTIFY_CLIENT_ID o SPOTIFY_CLIENT_SECRET en variables de entorno');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await axios.post(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  // Guardamos el token con expiración (Spotify da 3600s, usamos 3500s por seguridad)
  cache.token = response.data.access_token;
  cache.tokenExpiry = now + (response.data.expires_in - 100) * 1000;
  console.log('✅ Token nuevo obtenido y cacheado');

  return cache.token;
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

// ─── GET /api/spotify/featured ────────────────────────────────────────────────
exports.getFeaturedTracks = async (req, res) => {
  try {
    const now = Date.now();

    // Caché de 10 minutos para las canciones destacadas
    if (cache.featuredTracks && cache.featuredExpiry && now < cache.featuredExpiry) {
      console.log('🎵 Featured tracks desde caché');
      return res.status(200).json({
        success: true,
        tracks: cache.featuredTracks,
      });
    }

    const token = await getSpotifyToken();

    // Pequeña pausa para evitar rate limiting
    await new Promise((resolve) => setTimeout(resolve, 300));

    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        q: 'pop hits',
        type: 'track',
        limit: 20,
        market: 'US',
      },
    });

    const allTracks = response.data.tracks.items.map(mapTrack);
    const withPreview = allTracks.filter((t) => t.previewUrl);
    const withoutPreview = allTracks.filter((t) => !t.previewUrl);
    const tracks = [...withPreview, ...withoutPreview];

    // Guardar en caché por 10 minutos
    cache.featuredTracks = tracks;
    cache.featuredExpiry = now + 10 * 60 * 1000;

    console.log(`✅ Featured: ${withPreview.length} con preview, ${withoutPreview.length} sin preview`);

    res.status(200).json({ success: true, tracks });

  } catch (error) {
    console.error('❌ Error en getFeaturedTracks:', JSON.stringify(error.response?.data, null, 2) || error.message);
    console.error('❌ Status HTTP:', error.response?.status);

    // Si hay caché vieja, úsala antes de fallar
    if (cache.featuredTracks) {
      console.log('⚠️ Usando caché vieja por error de Spotify');
      return res.status(200).json({
        success: true,
        tracks: cache.featuredTracks,
      });
    }

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

    const parsedLimit = parseInt(limit, 10);
    const safeLimit = !isNaN(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 50 ? parsedLimit : 20;

    const token = await getSpotifyToken();

    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        q: q.trim(),
        type: 'track',
        limit: safeLimit,
        market: 'US',
      },
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
      `https://api.spotify.com/v1/tracks/${id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { market: 'US' },
      }
    );

    res.status(200).json({ success: true, track: mapTrack(response.data) });

  } catch (error) {
    console.error('❌ Error en getTrackById:', JSON.stringify(error.response?.data, null, 2) || error.message);
    res.status(500).json({ success: false, message: 'Error al obtener la canción' });
  }
};