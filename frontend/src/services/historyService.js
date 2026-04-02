// src/services/historyService.js
import api from '../config/api';

const historyService = {

  // Registrar una reproducción (llamar cuando empiece a sonar una canción)
  registerPlay: async (track) => {
    try {
      // Separar artistas y tomar solo el primero como principal
      const allArtists   = (track.artist || '').split(',').map(a => a.trim()).filter(Boolean);
      const primaryName  = allArtists[0] || track.artist;

      // El artistId puede venir igual de sucio — tomar solo el primero también
      const allIds      = (track.artistId || '').split(',').map(a => a.trim()).filter(Boolean);
      const primaryId   = allIds[0] || primaryName;

      await api.post('/history/play', {
        trackId:    track.id,
        trackName:  track.name,
        artistName: primaryName,          // solo el artista principal
        artistId:   primaryId,            // solo su ID
        albumName:  track.album    || '',
        albumImage: track.albumImage || '',
        genre:      track.genre    || 'unknown',
        // Mandamos la lista completa para que el backend construya el grafo
        allArtists: allArtists,
        allArtistIds: allIds,
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