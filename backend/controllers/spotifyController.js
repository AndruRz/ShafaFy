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

    // ✅ MEJORA: Búsquedas optimizadas para encontrar canciones CON preview
    // Géneros y términos que suelen tener más previews disponibles
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

    // Hacer múltiples búsquedas hasta conseguir suficientes canciones con preview
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

        // Si ya tenemos suficientes canciones con preview, parar
        if (allTracksWithPreview.length >= 20) {
          break;
        }

        // Pausa entre peticiones
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
    // Solo agregar algunas sin preview al final (máximo 5)
    const tracks = [
      ...uniqueWithPreview.slice(0, 20),
      ...uniqueWithoutPreview.slice(0, 5)
    ];

    // Guardar en caché
    cache.featuredTracks = tracks;
    cache.featuredExpiry = now + 10 * 60 * 1000;

    console.log(`✅ Featured final: ${uniqueWithPreview.length} CON preview, ${uniqueWithoutPreview.slice(0, 5).length} sin preview`);
    console.log(`📊 Total enviado al frontend: ${tracks.length} canciones`);

    res.status(200).json({ 
      success: true, 
      tracks,
      stats: {
        withPreview: uniqueWithPreview.length,
        withoutPreview: uniqueWithoutPreview.slice(0, 5).length
      }
    });

  } catch (error) {
    console.error('❌ Error en getFeaturedTracks:', JSON.stringify(error.response?.data, null, 2) || error.message);
    console.error('❌ Status HTTP:', error.response?.status);

    // Si hay caché vieja, úsala
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
    const safeLimit = !isNaN(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 10 ? parsedLimit : 10;

    const token = await getSpotifyToken();

    // ✅ MEJORA: Hacer 2 búsquedas para conseguir más resultados con preview
    const searches = [
      { q: q.trim(), limit: safeLimit },
      { q: `${q.trim()} top`, limit: Math.ceil(safeLimit / 2) }
    ];

    let allTracksWithPreview = [];
    let allTracksWithoutPreview = [];

    for (const search of searches) {
      try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            q: search.q,
            type: 'track',
            limit: search.limit,
            market: 'US',
          },
        });

        const tracks = response.data.tracks.items.map(mapTrack);
        const withPreview = tracks.filter((t) => t.previewUrl);
        const withoutPreview = tracks.filter((t) => !t.previewUrl);

        allTracksWithPreview = allTracksWithPreview.concat(withPreview);
        allTracksWithoutPreview = allTracksWithoutPreview.concat(withoutPreview);

        await new Promise((resolve) => setTimeout(resolve, 150));
      } catch (searchError) {
        console.warn(`⚠️ Error en búsqueda:`, searchError.message);
      }
    }

    // Eliminar duplicados
    const uniqueWithPreview = Array.from(
      new Map(allTracksWithPreview.map(track => [track.id, track])).values()
    );
    
    const uniqueWithoutPreview = Array.from(
      new Map(allTracksWithoutPreview.map(track => [track.id, track])).values()
    );

    // Priorizar con preview
    const finalTracks = [
      ...uniqueWithPreview,
      ...uniqueWithoutPreview
    ].slice(0, safeLimit + 5); // Un poco más de resultados

    console.log(`🔍 Búsqueda "${q}": ${uniqueWithPreview.length} con preview de ${finalTracks.length} totales`);

    res.status(200).json({
      success: true,
      tracks: finalTracks,
      stats: {
        withPreview: uniqueWithPreview.length,
        total: finalTracks.length
      }
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

// ─── GET /api/spotify/with-preview ──────────────────────────────────────────
// ✅ NUEVO ENDPOINT: Solo canciones con preview garantizado
exports.getTracksWithPreview = async (req, res) => {
  try {
    const token = await getSpotifyToken();
    const limit = parseInt(req.query.limit) || 20;

    // Géneros que suelen tener más previews
    const genres = [
      'latin pop',
      'reggaeton',
      'dance pop',
      'pop rock',
      'hip hop',
      'electronic'
    ];

    let tracksWithPreview = [];

    for (const genre of genres) {
      if (tracksWithPreview.length >= limit) break;

      try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            q: `genre:${genre}`,
            type: 'track',
            limit: 10,
            market: 'US',
          },
        });

        const tracks = response.data.tracks.items
          .map(mapTrack)
          .filter(t => t.previewUrl); // Solo con preview

        tracksWithPreview = tracksWithPreview.concat(tracks);

        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.warn(`⚠️ Error buscando género ${genre}:`, error.message);
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
};// ─── AGREGAR ESTOS MÉTODOS AL FINAL DE spotifyController.js ──────────────────

// ─── GET /api/spotify/artist/search?q=bad+bunny ───────────────────────────────
// Busca artistas por nombre, devuelve el más relevante con info básica
exports.searchArtist = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.status(400).json({ success: false, message: 'El parámetro q es requerido' });
    }

    const token = await getSpotifyToken();

    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: { q: q.trim(), type: 'artist', limit: 5, market: 'US' },
    });

    const artists = response.data.artists.items;
    if (!artists || artists.length === 0) {
      return res.status(404).json({ success: false, message: 'No se encontraron artistas' });
    }

    // El endpoint de search a veces devuelve followers=0
    // Enriquecemos el top artista con datos reales del endpoint /artists/:id
    const mapped = artists.map((a) => ({
      id: a.id,
      name: a.name,
      image: a.images[0]?.url || null,
      genres: a.genres || [],
      followers: a.followers?.total || 0,
      popularity: a.popularity || 0,
      spotifyUrl: a.external_urls?.spotify || null,
    }));

    // Enriquecer el primer artista con datos reales si followers es 0
    if (mapped.length > 0 && mapped[0].followers === 0) {
      try {
        const fullArtist = await axios.get(
          `https://api.spotify.com/v1/artists/${mapped[0].id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        mapped[0].followers = fullArtist.data.followers?.total || 0;
        mapped[0].popularity = fullArtist.data.popularity || 0;
        if (!mapped[0].image && fullArtist.data.images?.[0]) {
          mapped[0].image = fullArtist.data.images[0].url;
        }
      } catch (_) {}
    }

    res.status(200).json({ success: true, artists: mapped });
  } catch (error) {
    console.error('❌ Error en searchArtist:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Error al buscar artistas' });
  }
};

// ─── GET /api/spotify/artist/:id ─────────────────────────────────────────────
// Devuelve info completa del artista: datos, top tracks y álbumes
// Cada petición es independiente para tolerar 403 parciales de Spotify en modo dev
exports.getArtistProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const token = await getSpotifyToken();

    const headers = { Authorization: `Bearer ${token}` };

    // ── Info básica del artista ──────────────────────────────────────────────
    const artistRes = await axios.get(`https://api.spotify.com/v1/artists/${id}`, { headers });
    const artist = artistRes.data;

    // ── Canciones del artista via búsqueda (no usa top-tracks que da 403) ──────
    // Spotify en modo dev bloquea /top-tracks, usamos search que sí funciona
    let topTracks = [];
    try {
      // 3 búsquedas paginadas para traer hasta ~60 canciones
      const offsets = [0, 20, 40];
      for (const offset of offsets) {
        try {
          const res = await axios.get('https://api.spotify.com/v1/search', {
            headers,
            params: {
              q: artist.name,   // búsqueda simple por nombre, sin filtro rígido
              type: 'track',
              limit: 20,
              market: 'US',
              offset,
            },
          });
          // Filtro flexible: incluir si el artista aparece en cualquier posición
          // (acepta colaboraciones y features, pero descarta artistas completamente distintos)
          const artistNameLower = artist.name.toLowerCase();
          const filtered = res.data.tracks.items.filter((t) =>
            t.artists.some((a) => a.name.toLowerCase().includes(artistNameLower) ||
                                   artistNameLower.includes(a.name.toLowerCase()))
          );
          topTracks = topTracks.concat(filtered.map(mapTrack));
          await new Promise((r) => setTimeout(r, 150));
        } catch (_) {}
      }
      // Deduplicar por ID
      topTracks = Array.from(new Map(topTracks.map((t) => [t.id, t])).values());
      console.log(`✅ Canciones de ${artist.name}: ${topTracks.length}`);
    } catch (e) {
      console.warn(`⚠️ búsqueda de canciones falló:`, e.message);
    }

    // ── Álbumes (tolerante a 403) ─────────────────────────────────────────────
    let uniqueAlbums = [];
    try {
      const albumsRes = await axios.get(
        `https://api.spotify.com/v1/artists/${id}/albums`,
        { headers, params: { market: 'US', limit: 10, include_groups: 'album,single' } }
      );
      const albums = albumsRes.data.items.map((album) => ({
        id: album.id,
        name: album.name,
        image: album.images[0]?.url || null,
        releaseDate: album.release_date,
        totalTracks: album.total_tracks,
        type: album.album_type,
        spotifyUrl: album.external_urls?.spotify || null,
      }));
      uniqueAlbums = Array.from(
        new Map(albums.map((a) => [a.name.toLowerCase(), a])).values()
      );
    } catch (e) {
      console.warn(`⚠️ albums no disponible para ${id}:`, e.response?.data?.error?.message || e.message);
    }

    res.status(200).json({
      success: true,
      artist: {
        id: artist.id,
        name: artist.name,
        image: artist.images[0]?.url || null,
        imageMedium: artist.images[1]?.url || null,
        genres: artist.genres || [],
        followers: artist.followers?.total || 0,
        popularity: artist.popularity || 0,
        spotifyUrl: artist.external_urls?.spotify || null,
      },
      topTracks,
      albums: uniqueAlbums,
    });
  } catch (error) {
    console.error('❌ Error en getArtistProfile:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Error al cargar perfil del artista' });
  }
};