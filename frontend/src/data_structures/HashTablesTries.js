// ../data_structures/HashTablesTries.js

/**
 * Carga las canciones destacadas (featured).
 * @param {object} spotifyService - servicio de Spotify inyectado
 * @returns {Promise<Array>} lista de tracks
 */
export async function fetchFeaturedTracks(spotifyService) {
  const data = await spotifyService.getFeatured();
  return data;
}

/**
 * Busca canciones y artistas según un query.
 * @param {string} query - texto de búsqueda
 * @param {object} spotifyService - servicio de Spotify inyectado
 * @returns {Promise<{ tracks: Array, topArtist: object|null, searchArtistTracks: Array }>}
 */
export async function searchTracksAndArtists(query, spotifyService) {
  const [trackResults, artistResults] = await Promise.all([
    spotifyService.search(query),
    spotifyService.searchArtists(query),
  ]);

  let topArtist = null;
  let searchArtistTracks = [];

  if (artistResults?.length > 0) {
    const top = artistResults[0];
    const nameMatch =
      top.name.toLowerCase().includes(query.toLowerCase()) ||
      query.toLowerCase().includes(top.name.toLowerCase().split(' ')[0]);

    if (nameMatch) {
      topArtist = top;
      const aLow = top.name.toLowerCase();
      const filtered = trackResults.filter(t =>
        t.artist.toLowerCase().includes(aLow) ||
        aLow.includes(t.artist.toLowerCase().split(',')[0].trim())
      );
      searchArtistTracks = filtered.length > 0 ? filtered : trackResults;
    }
  }

  return { tracks: trackResults, topArtist, searchArtistTracks };
}