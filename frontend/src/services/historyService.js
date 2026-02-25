// src/services/historyService.js
import api from '../config/api';

const historyService = {

  // Registrar una reproducción (llamar cuando empiece a sonar una canción)
  registerPlay: async (track) => {
    try {
      await api.post('/history/play', {
        trackId:    track.id,
        trackName:  track.name,
        artistName: track.artist,
        artistId:   track.artistId || track.artist, // fallback al nombre si no hay ID
        albumName:  track.album  || '',
        albumImage: track.albumImage || '',
        genre:      track.genre  || 'unknown',
      });
    } catch (error) {
      // No interrumpir la reproducción si falla el registro
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