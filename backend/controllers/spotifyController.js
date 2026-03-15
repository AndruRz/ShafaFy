const axios = require('axios');

// ─── Caché simple en memoria ──────────────────────────────────────────────────
const cache = {
  token:          null,
  tokenExpiry:    null,
  featuredTracks: null,
  featuredExpiry: null,
  artistGenres:   new Map(), // artistId → [genres]  (evita llamadas repetidas)
};

// ─── Obtener Access Token de Spotify (con caché) ──────────────────────────────
const getSpotifyToken = async () => {
  const now = Date.now();
  if (cache.token && cache.tokenExpiry && now < cache.tokenExpiry) {
    return cache.token;
  }

  const clientId     = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Faltan SPOTIFY_CLIENT_ID o SPOTIFY_CLIENT_SECRET en variables de entorno');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response    = await axios.post(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  cache.token       = response.data.access_token;
  cache.tokenExpiry = now + (response.data.expires_in - 100) * 1000;
  console.log('✅ Token nuevo obtenido y cacheado');
  return cache.token;
};

// ─── Obtener géneros de un artista (con caché por artistId) ───────────────────
// La API de Spotify NO incluye géneros en el objeto track, solo en el objeto artist.
// Esta función obtiene los géneros del primer artista del track y los cachea
// para no repetir llamadas al mismo artista.
const getArtistGenres = async (token, artistId) => {
  if (!artistId) return 'unknown';

  // Si ya lo tenemos en caché, devolverlo directo
  if (cache.artistGenres.has(artistId)) {
    return cache.artistGenres.get(artistId);
  }

  try {
    const res    = await axios.get(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const genres = res.data.genres || [];
    // Guardar el primer género como string, o 'unknown' si viene vacío
    const genre  = genres.length > 0 ? genres[0] : 'unknown';
    cache.artistGenres.set(artistId, genre);
    return genre;
  } catch (_) {
    cache.artistGenres.set(artistId, 'unknown');
    return 'unknown';
  }
};

// ─── Enriquecer un batch de tracks con géneros ────────────────────────────────
// Agrupa los artistIds únicos, hace las llamadas en paralelo (máx 5 a la vez
// para no golpear el rate limit de Spotify) y asigna el género a cada track.
const enrichTracksWithGenres = async (token, tracks) => {
  if (!tracks || tracks.length === 0) return tracks;

  // Recopilar artistIds únicos que aún no tenemos en caché
  const uncachedIds = [...new Set(
    tracks
      .map(t => t._artistId)
      .filter(id => id && !cache.artistGenres.has(id))
  )];

  // Llamadas en lotes de 5 para no saturar la API
  const BATCH = 5;
  for (let i = 0; i < uncachedIds.length; i += BATCH) {
    const batch = uncachedIds.slice(i, i + BATCH);
    await Promise.all(batch.map(id => getArtistGenres(token, id)));
    // Pequeña pausa entre lotes
    if (i + BATCH < uncachedIds.length) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  // Asignar género a cada track
  return tracks.map(track => ({
    ...track,
    genre: cache.artistGenres.get(track._artistId) || 'unknown',
    _artistId: undefined, // limpiar campo interno antes de enviar al frontend
  }));
};

// ─── Mapear track al formato que usa el frontend ──────────────────────────────
// _artistId es un campo interno usado por enrichTracksWithGenres, no se envía al frontend
const mapTrack = (track) => ({
  id:          track.id,
  name:        track.name,
  artist:      track.artists.map((a) => a.name).join(', '),
  artistId:    track.artists[0]?.id || null,
  album:       track.album.name,
  albumImage:  track.album.images[0]?.url || null,
  previewUrl:  track.preview_url,
  spotifyUrl:  track.external_urls.spotify,
  duration:    track.duration_ms,
  popularity:  track.popularity,
  genre:       'unknown',     // placeholder — se reemplaza en enrichTracksWithGenres
  _artistId:   track.artists[0]?.id || null, // campo interno para el enriquecimiento
});

// ─── GET /api/spotify/featured ────────────────────────────────────────────────
exports.getFeaturedTracks = async (req, res) => {
  try {
    const now = Date.now();

    if (cache.featuredTracks && cache.featuredExpiry && now < cache.featuredExpiry) {
      console.log('🎵 Featured tracks desde caché');
      return res.status(200).json({ success: true, tracks: cache.featuredTracks });
    }

    const token = await getSpotifyToken();

    const searchQueries = [
      'top 50 global',
      'viral hits 2024',
      'pop latino',
      'reggaeton hits',
      'rock classics',
      'electronic dance',
    ];

    let allTracksWithPreview    = [];
    let allTracksWithoutPreview = [];

    for (const query of searchQueries) {
      try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
          headers: { Authorization: `Bearer ${token}` },
          params: { q: query, type: 'track', limit: 10, market: 'US' },
        });

        const tracks       = response.data.tracks.items.map(mapTrack);
        const withPreview  = tracks.filter(t => t.previewUrl);
        const withoutPreview = tracks.filter(t => !t.previewUrl);

        allTracksWithPreview    = allTracksWithPreview.concat(withPreview);
        allTracksWithoutPreview = allTracksWithoutPreview.concat(withoutPreview);

        console.log(`🔍 "${query}": ${withPreview.length} con preview de ${tracks.length} totales`);
        if (allTracksWithPreview.length >= 20) break;

        await new Promise(r => setTimeout(r, 200));
      } catch (searchError) {
        console.warn(`⚠️ Error en búsqueda "${query}":`, searchError.message);
      }
    }

    // Deduplicar
    const uniqueWithPreview    = Array.from(new Map(allTracksWithPreview.map(t => [t.id, t])).values());
    const uniqueWithoutPreview = Array.from(new Map(allTracksWithoutPreview.map(t => [t.id, t])).values());

    const rawTracks = [
      ...uniqueWithPreview.slice(0, 20),
      ...uniqueWithoutPreview.slice(0, 5),
    ];

    // ✅ Enriquecer con géneros reales
    const tracks = await enrichTracksWithGenres(token, rawTracks);

    cache.featuredTracks = tracks;
    cache.featuredExpiry = now + 10 * 60 * 1000;

    console.log(`✅ Featured final: ${uniqueWithPreview.length} CON preview`);
    console.log(`📊 Total enviado al frontend: ${tracks.length} canciones`);

    res.status(200).json({
      success: true,
      tracks,
      stats: {
        withPreview:    uniqueWithPreview.length,
        withoutPreview: uniqueWithoutPreview.slice(0, 5).length,
      },
    });

  } catch (error) {
    console.error('❌ Error en getFeaturedTracks:', error.response?.data || error.message);
    if (cache.featuredTracks) {
      return res.status(200).json({ success: true, tracks: cache.featuredTracks });
    }
    res.status(500).json({ success: false, message: 'Error al cargar canciones', detail: error.response?.data || error.message });
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
    const safeLimit   = !isNaN(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 10 ? parsedLimit : 10;
    const token       = await getSpotifyToken();

    const searches = [
      { q: q.trim(),              limit: safeLimit },
      { q: `${q.trim()} top`,     limit: Math.ceil(safeLimit / 2) },
    ];

    let allTracksWithPreview    = [];
    let allTracksWithoutPreview = [];

    for (const search of searches) {
      try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
          headers: { Authorization: `Bearer ${token}` },
          params: { q: search.q, type: 'track', limit: search.limit, market: 'US' },
        });

        const tracks = response.data.tracks.items.map(mapTrack);
        allTracksWithPreview    = allTracksWithPreview.concat(tracks.filter(t => t.previewUrl));
        allTracksWithoutPreview = allTracksWithoutPreview.concat(tracks.filter(t => !t.previewUrl));

        await new Promise(r => setTimeout(r, 150));
      } catch (searchError) {
        console.warn(`⚠️ Error en búsqueda:`, searchError.message);
      }
    }

    const uniqueWithPreview    = Array.from(new Map(allTracksWithPreview.map(t => [t.id, t])).values());
    const uniqueWithoutPreview = Array.from(new Map(allTracksWithoutPreview.map(t => [t.id, t])).values());

    const rawTracks = [...uniqueWithPreview, ...uniqueWithoutPreview].slice(0, safeLimit + 5);

    // ✅ Enriquecer con géneros reales
    const finalTracks = await enrichTracksWithGenres(token, rawTracks);

    console.log(`🔍 Búsqueda "${q}": ${uniqueWithPreview.length} con preview de ${finalTracks.length} totales`);

    res.status(200).json({
      success: true,
      tracks: finalTracks,
      stats: { withPreview: uniqueWithPreview.length, total: finalTracks.length },
    });

  } catch (error) {
    console.error('❌ Error en searchTracks:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Error al buscar canciones', detail: error.response?.data || error.message });
  }
};

// ─── GET /api/spotify/track/:id ───────────────────────────────────────────────
exports.getTrackById = async (req, res) => {
  try {
    const { id }   = req.params;
    const token    = await getSpotifyToken();
    const response = await axios.get(`https://api.spotify.com/v1/tracks/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      params:  { market: 'US' },
    });

    const [enriched] = await enrichTracksWithGenres(token, [mapTrack(response.data)]);
    res.status(200).json({ success: true, track: enriched });

  } catch (error) {
    console.error('❌ Error en getTrackById:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Error al obtener la canción' });
  }
};

// ─── GET /api/spotify/with-preview ───────────────────────────────────────────
exports.getTracksWithPreview = async (req, res) => {
  try {
    const token = await getSpotifyToken();
    const limit = parseInt(req.query.limit) || 20;

    const genres = [
      'latin pop', 'reggaeton', 'dance pop',
      'pop rock',  'hip hop',   'electronic',
    ];

    let tracksWithPreview = [];

    for (const genre of genres) {
      if (tracksWithPreview.length >= limit) break;
      try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
          headers: { Authorization: `Bearer ${token}` },
          params:  { q: `genre:${genre}`, type: 'track', limit: 10, market: 'US' },
        });
        const tracks = response.data.tracks.items.map(mapTrack).filter(t => t.previewUrl);
        tracksWithPreview = tracksWithPreview.concat(tracks);
        await new Promise(r => setTimeout(r, 200));
      } catch (error) {
        console.warn(`⚠️ Error buscando género ${genre}:`, error.message);
      }
    }

    const rawTracks = Array.from(new Map(tracksWithPreview.map(t => [t.id, t])).values()).slice(0, limit);

    // ✅ Enriquecer con géneros reales
    const uniqueTracks = await enrichTracksWithGenres(token, rawTracks);

    console.log(`✅ Canciones con preview: ${uniqueTracks.length} de ${limit} solicitadas`);
    res.status(200).json({ success: true, tracks: uniqueTracks, count: uniqueTracks.length });

  } catch (error) {
    console.error('❌ Error en getTracksWithPreview:', error.message);
    res.status(500).json({ success: false, message: 'Error al cargar canciones con preview' });
  }
};

// ─── GET /api/spotify/artist/search?q=bad+bunny ───────────────────────────────
exports.searchArtist = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.status(400).json({ success: false, message: 'El parámetro q es requerido' });
    }

    const token    = await getSpotifyToken();
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${token}` },
      params:  { q: q.trim(), type: 'artist', limit: 5, market: 'US' },
    });

    const artists = response.data.artists.items;
    if (!artists || artists.length === 0) {
      return res.status(404).json({ success: false, message: 'No se encontraron artistas' });
    }

    const mapped = artists.map(a => ({
      id:         a.id,
      name:       a.name,
      image:      a.images[0]?.url || null,
      genres:     a.genres || [],
      followers:  a.followers?.total || 0,
      popularity: a.popularity || 0,
      spotifyUrl: a.external_urls?.spotify || null,
    }));

    // Enriquecer el primer artista si followers = 0
    if (mapped.length > 0 && mapped[0].followers === 0) {
      try {
        const fullArtist = await axios.get(`https://api.spotify.com/v1/artists/${mapped[0].id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        mapped[0].followers  = fullArtist.data.followers?.total || 0;
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
exports.getArtistProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const token  = await getSpotifyToken();
    const headers = { Authorization: `Bearer ${token}` };

    // Info básica del artista
    const artistRes = await axios.get(`https://api.spotify.com/v1/artists/${id}`, { headers });
    const artist    = artistRes.data;

    // Guardar géneros del artista en caché
    const artistGenre = artist.genres?.[0] || 'unknown';
    cache.artistGenres.set(id, artistGenre);

    // Canciones del artista
    let topTracks = [];
    try {
      const artistNameLower = artist.name.toLowerCase();

      // Estrategia 1: endpoint oficial /top-tracks
      try {
        const topTracksRes = await axios.get(
          `https://api.spotify.com/v1/artists/${id}/top-tracks`,
          { headers, params: { market: 'US' } }
        );
        if (topTracksRes.data.tracks?.length > 0) {
          topTracks = topTracksRes.data.tracks.map(mapTrack);
          console.log(`✅ top-tracks oficial: ${topTracks.length} canciones para "${artist.name}"`);
        }
      } catch (e) {
        console.warn(`⚠️ top-tracks falló (${e.response?.status}), usando búsqueda alternativa...`);
      }

      // Estrategia 2: búsqueda por nombre si top-tracks falló
      if (topTracks.length === 0) {
        const offsets = [0, 20, 40];
        for (const offset of offsets) {
          try {
            const res = await axios.get('https://api.spotify.com/v1/search', {
              headers,
              params: { q: `artist:"${artist.name}"`, type: 'track', limit: 50, market: 'US', offset },
            });
            const filtered = res.data.tracks.items.filter(t =>
              t.artists.some(a =>
                a.id === id ||
                a.name.toLowerCase() === artistNameLower ||
                a.name.toLowerCase().includes(artistNameLower) ||
                artistNameLower.includes(a.name.toLowerCase())
              )
            );
            topTracks = topTracks.concat(filtered.map(mapTrack));
            await new Promise(r => setTimeout(r, 150));
          } catch (_) {}
        }
      }

      // Deduplicar y ordenar
      topTracks = Array.from(new Map(topTracks.map(t => [t.id, t])).values())
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 20);

      // ✅ Enriquecer con géneros — para las canciones del artista,
      // usamos directamente el género del artista (ya lo tenemos en caché)
      topTracks = await enrichTracksWithGenres(token, topTracks);

      console.log(`✅ Canciones encontradas para "${artist.name}": ${topTracks.length}`);
    } catch (e) {
      console.warn(`⚠️ búsqueda de canciones falló:`, e.message);
    }

    // Álbumes
    let uniqueAlbums = [];
    try {
      const albumsRes = await axios.get(
        `https://api.spotify.com/v1/artists/${id}/albums`,
        { headers, params: { market: 'US', limit: 10, include_groups: 'album,single' } }
      );
      const albums = albumsRes.data.items.map(album => ({
        id:          album.id,
        name:        album.name,
        image:       album.images[0]?.url || null,
        releaseDate: album.release_date,
        totalTracks: album.total_tracks,
        type:        album.album_type,
        spotifyUrl:  album.external_urls?.spotify || null,
      }));
      uniqueAlbums = Array.from(new Map(albums.map(a => [a.name.toLowerCase(), a])).values());
    } catch (e) {
      console.warn(`⚠️ albums no disponible para ${id}:`, e.message);
    }

    res.status(200).json({
      success: true,
      artist: {
        id:          artist.id,
        name:        artist.name,
        image:       artist.images[0]?.url || null,
        imageMedium: artist.images[1]?.url || null,
        genres:      artist.genres || [],
        followers:   artist.followers?.total || 0,
        popularity:  artist.popularity || 0,
        spotifyUrl:  artist.external_urls?.spotify || null,
      },
      topTracks,
      albums: uniqueAlbums,
    });

  } catch (error) {
    console.error('❌ Error en getArtistProfile:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Error al cargar perfil del artista' });
  }
};