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

    // Caché de 10 minutos
    if (cache.featuredTracks && cache.featuredExpiry && now < cache.featuredExpiry) {
      console.log('🎵 Featured tracks desde caché');
      return res.status(200).json({
        success: true,
        tracks: cache.featuredTracks,
      });
    }

    const token = await getSpotifyToken();

    // ✅ Búsquedas optimizadas para encontrar canciones CON preview
    const searchQueries = [
      'top 50 global',
      'viral hits 2024',
      'pop latino',
      'reggaeton hits',
      'rock classics',
      'electronic dance'
    ];
    
    let allTracksWithPreview = [];
    let allTracksWithoutPreview = [];

    for (const query of searchQueries) {
      try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            q: query,
            type: 'track',
            limit: 10,
            market: 'US',
          },
        });

        const tracks = response.data.tracks.items.map(mapTrack);
        const withPreview = tracks.filter((t) => t.previewUrl);
        const withoutPreview = tracks.filter((t) => !t.previewUrl);

        allTracksWithPreview = allTracksWithPreview.concat(withPreview);
        allTracksWithoutPreview = allTracksWithoutPreview.concat(withoutPreview);

        console.log(`🔍 "${query}": ${withPreview.length} con preview de ${tracks.length} totales`);

        if (allTracksWithPreview.length >= 20) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (searchError) {
        console.warn(`⚠️ Error en búsqueda "${query}":`, searchError.message);
      }
    }

    // Eliminar duplicados por ID
    const uniqueWithPreview = Array.from(
      new Map(allTracksWithPreview.map(track => [track.id, track])).values()
    );
    
    const uniqueWithoutPreview = Array.from(
      new Map(allTracksWithoutPreview.map(track => [track.id, track])).values()
    );

    // ✅ PRIORIZAR canciones con preview al inicio
    const tracks = [
      ...uniqueWithPreview.slice(0, 20),
      ...uniqueWithoutPreview.slice(0, 5)
    ];

    // Guardar en caché
    cache.featuredTracks = tracks;
    cache.featuredExpiry = now + 10 * 60 * 1000;

    console.log(`✅ Featured final: ${uniqueWithPreview.length} CON preview, ${uniqueWithoutPreview.slice(0, 5).length} sin preview`);

    res.status(200).json({ 
      success: true, 
      tracks,
      stats: {
        withPreview: uniqueWithPreview.length,
        withoutPreview: uniqueWithoutPreview.slice(0, 5).length
      }
    });

  } catch (error) {
    console.error('❌ Error en getFeaturedTracks:', error.message);

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
      detail: error.message,
    });
  }
};

// ─── GET /api/spotify/search?q=...&limit=15 ──────────────────────────────────
// ✅ MEJORADO: Busca en múltiples mercados para encontrar más previews
exports.searchTracks = async (req, res) => {
  try {
    const { q, limit } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({ success: false, message: 'El parámetro q es requerido' });
    }

    const parsedLimit = parseInt(limit, 10);
    const safeLimit = !isNaN(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 20 ? parsedLimit : 15;

    const token = await getSpotifyToken();

    // ✅ Buscar en múltiples mercados para maximizar previews
    const markets = ['US', 'MX', 'ES', 'CO', 'AR'];
    let allTracksWithPreview = [];
    let allTracksWithoutPreview = [];

    for (const market of markets) {
      try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            q: q.trim(),
            type: 'track',
            limit: 20,
            market: market,
          },
        });

        const tracks = response.data.tracks.items.map(mapTrack);
        const withPreview = tracks.filter((t) => t.previewUrl);
        const withoutPreview = tracks.filter((t) => !t.previewUrl);

        allTracksWithPreview = allTracksWithPreview.concat(withPreview);
        allTracksWithoutPreview = allTracksWithoutPreview.concat(withoutPreview);

        console.log(`🔍 Mercado ${market}: ${withPreview.length} con preview`);

        // Si ya tenemos suficientes con preview, parar
        if (allTracksWithPreview.length >= safeLimit) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 150));
      } catch (searchError) {
        console.warn(`⚠️ Error en mercado ${market}:`, searchError.message);
      }
    }

    // Eliminar duplicados
    const uniqueWithPreview = Array.from(
      new Map(allTracksWithPreview.map(track => [track.id, track])).values()
    );
    
    const uniqueWithoutPreview = Array.from(
      new Map(allTracksWithoutPreview.map(track => [track.id, track])).values()
    );

    // ✅ Priorizar canciones con preview
    const finalTracks = [
      ...uniqueWithPreview.slice(0, safeLimit),
      ...uniqueWithoutPreview.slice(0, Math.max(5, safeLimit - uniqueWithPreview.length))
    ];

    console.log(`✅ Búsqueda "${q}": ${uniqueWithPreview.length} con preview de ${finalTracks.length} totales`);

    res.status(200).json({
      success: true,
      tracks: finalTracks,
      stats: {
        withPreview: uniqueWithPreview.length,
        total: finalTracks.length
      }
    });

  } catch (error) {
    console.error('❌ Error en searchTracks:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al buscar canciones',
      detail: error.message,
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
// ✅ ENDPOINT ESPECIAL: Solo canciones con preview GARANTIZADO
exports.getTracksWithPreview = async (req, res) => {
  try {
    const token = await getSpotifyToken();
    const limit = parseInt(req.query.limit) || 20;

    // Géneros y búsquedas que suelen tener más previews
    const searches = [
      'latin pop hits',
      'reggaeton 2024',
      'dance pop',
      'top global',
      'rock classics',
      'electronic dance',
      'hip hop',
      'indie pop'
    ];

    let tracksWithPreview = [];

    for (const search of searches) {
      if (tracksWithPreview.length >= limit) break;

      try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            q: search,
            type: 'track',
            limit: 15,
            market: 'US',
          },
        });

        const tracks = response.data.tracks.items
          .map(mapTrack)
          .filter(t => t.previewUrl); // ✅ SOLO con preview

        tracksWithPreview = tracksWithPreview.concat(tracks);

        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.warn(`⚠️ Error buscando "${search}":`, error.message);
      }
    }

    // Eliminar duplicados
    const uniqueTracks = Array.from(
      new Map(tracksWithPreview.map(track => [track.id, track])).values()
    ).slice(0, limit);

    console.log(`✅ Canciones con preview: ${uniqueTracks.length} de ${limit} solicitadas`);

    res.status(200).json({
      success: true,
      tracks: uniqueTracks,
      count: uniqueTracks.length
    });

  } catch (error) {
    console.error('❌ Error en getTracksWithPreview:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al cargar canciones con preview'
    });
  }
};