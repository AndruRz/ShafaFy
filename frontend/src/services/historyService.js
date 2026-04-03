// src/services/historyService.js
import api from '../config/api';

const historyService = {

  // Registrar una reproducción (llamar cuando empiece a sonar una canción)
  registerPlay: async (track) => {
    try {
      // Separar nombres — vienen como "LATIN MAFIA, Omar Apollo"
      const allArtistNames = (track.artist || '')
        .split(',')
        .map(a => a.trim())
        .filter(Boolean);

      // Separar IDs — ahora vienen en artistIds: "id1, id2, id3"
      // fallback a artistId si artistIds no existe (compatibilidad)
      const allArtistIds = (track.artistIds || track.artistId || '')
        .split(',')
        .map(a => a.trim())
        .filter(Boolean);

      const primaryName = allArtistNames[0] || track.artist;
      const primaryId = allArtistIds[0] || null; // No hagas fallback al nombre

      await api.post('/history/play', {
        trackId:      track.id,
        trackName:    track.name,
        artistName:   primaryName,       // solo el artista principal
        artistId:     primaryId,         // solo su ID real de Spotify
        albumName:    track.album    || '',
        albumImage:   track.albumImage || '',
        genre:        track.genre    || 'unknown',
        // Lista completa para construir aristas del grafo correctamente
        allArtists:   allArtistNames,
        allArtistIds: allArtistIds,
      });
    } catch (error) {
      console.warn('No se pudo registrar la reproducción:', error.message);
    }
  },

  // Top 10 canciones más escuchadas del mes actual
  getTopTracks: async () => {
    try {
      const response = await api.get('/history/top-tracks');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al cargar top canciones' };
    }
  },

  // Top 10 artistas más escuchados del mes actual
  getTopArtists: async () => {
    try {
      const response = await api.get('/history/top-artists');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al cargar top artistas' };
    }
  },

  // Últimas 20 canciones reproducidas
  getRecentTracks: async () => {
    try {
      const response = await api.get('/history/recent');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al cargar historial reciente' };
    }
  },
};

export default historyService;