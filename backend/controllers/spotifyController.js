//controllers/spotifyController.js

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

    if (cache.featuredTracks && cache.featuredExpiry && now < cache.featuredExpiry) {
      console.log('🎵 Featured tracks desde caché');
      return res.status(200).json({
        success: true,
        tracks: cache.featuredTracks,
      });
    }

    const token = await getSpotifyToken();

    // ✅ Búsquedas SIMPLES que SÍ funcionan
    const searchQueries = [
      'bad bunny',
      'karol g',
      'shakira',
      'the weeknd',
      'drake',
      'taylor swift',
      'coldplay',
      'imagine dragons'
    ];
    
    let allTracksWithPreview = [];

    for (const query of searchQueries) {
      try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            q: query,
            type: 'track',
            limit: 5,
            market: 'US',
          },
        });

        const tracks = response.data.tracks.items
          .map(mapTrack)
          .filter((t) => t.previewUrl); // Solo con preview

        allTracksWithPreview = allTracksWithPreview.concat(tracks);

        console.log(`🔍 "${query}": ${tracks.length} con preview`);

        if (allTracksWithPreview.length >= 25) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (searchError) {
        console.warn(`⚠️ Error en búsqueda "${query}":`, searchError.message);
      }
    }

    // Eliminar duplicados
    const uniqueTracks = Array.from(
      new Map(allTracksWithPreview.map(track => [track.id, track])).values()
    ).slice(0, 20);

    cache.featuredTracks = uniqueTracks;
    cache.featuredExpiry = now + 10 * 60 * 1000;

    console.log(`✅ Featured: ${uniqueTracks.length} canciones CON preview`);

    res.status(200).json({ 
      success: true, 
      tracks: uniqueTracks,
    });

  } catch (error) {
    console.error('❌ Error en getFeaturedTracks:', error.message);

    if (cache.featuredTracks) {
      return res.status(200).json({
        success: true,
        tracks: cache.featuredTracks,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al cargar canciones',
    });
  }
};

// ─── GET /api/spotify/search?q=...&limit=15 ──────────────────────────────────
exports.searchTracks = async (req, res) => {
  try {
    const { q, limit } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({ success: false, message: 'El parámetro q es requerido' });
    }

    const parsedLimit = parseInt(limit, 10);
    const safeLimit = !isNaN(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 20 ? parsedLimit : 15;

    const token = await getSpotifyToken();

    // ✅ Búsqueda simple pero efectiva
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        q: q.trim(),
        type: 'track',
        limit: 50, // Pedir más para filtrar después
        market: 'US',
      },
    });

    const allTracks = response.data.tracks.items.map(mapTrack);
    
    // Separar canciones con y sin preview
    const withPreview = allTracks.filter((t) => t.previewUrl);
    const withoutPreview = allTracks.filter((t) => !t.previewUrl);

    // Priorizar con preview
    const finalTracks = [
      ...withPreview,
      ...withoutPreview
    ].slice(0, safeLimit);

    console.log(`✅ Búsqueda "${q}": ${withPreview.length} con preview de ${finalTracks.length} totales`);

    res.status(200).json({
      success: true,
      tracks: finalTracks,
    });

  } catch (error) {
    console.error('❌ Error en searchTracks:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al buscar canciones',
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
    console.error('❌ Error en getTrackById:', error.message);
    res.status(500).json({ success: false, message: 'Error al obtener la canción' });
  }
};

// ─── GET /api/spotify/with-preview ──────────────────────────────────────────
exports.getTracksWithPreview = async (req, res) => {
  try {
    const token = await getSpotifyToken();
    const limit = parseInt(req.query.limit) || 20;

    // ✅ Artistas populares que SIEMPRE tienen previews
    const artists = [
      'bad bunny',
      'taylor swift',
      'drake',
      'the weeknd',
      'ariana grande',
      'ed sheeran',
      'billie eilish',
      'post malone'
    ];

    let tracksWithPreview = [];

    for (const artist of artists) {
      if (tracksWithPreview.length >= limit) break;

      try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            q: artist,
            type: 'track',
            limit: 10,
            market: 'US',
          },
        });

        const tracks = response.data.tracks.items
          .map(mapTrack)
          .filter(t => t.previewUrl);

        tracksWithPreview = tracksWithPreview.concat(tracks);

        await new Promise((resolve) => setTimeout(resolve, 150));
      } catch (error) {
        console.warn(`⚠️ Error buscando "${artist}":`, error.message);
      }
    }

    // Eliminar duplicados
    const uniqueTracks = Array.from(
      new Map(tracksWithPreview.map(track => [track.id, track])).values()
    ).slice(0, limit);

    console.log(`✅ With-preview: ${uniqueTracks.length} canciones`);

    res.status(200).json({
      success: true,
      tracks: uniqueTracks,
    });

  } catch (error) {
    console.error('❌ Error en getTracksWithPreview:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al cargar canciones con preview'
    });
  }
};