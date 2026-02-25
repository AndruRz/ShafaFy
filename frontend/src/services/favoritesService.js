// src/services/favoritesService.js
import api from '../config/api';

const favoritesService = {

  toggle: async (track) => {
    try {
      const response = await api.post('/favorites/toggle', {
        trackId:    track.id,
        trackName:  track.name,
        artistName: track.artist,
        artistId:   track.artistId || track.artist,
        albumName:  track.album      || '',
        albumImage: track.albumImage || '',
        genre:      track.genre      || 'unknown',
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al actualizar favoritos' };
    }
  },

  getFavorites: async () => {
    try {
      const response = await api.get('/favorites');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al cargar favoritos' };
    }
  },

  checkFavorite: async (trackId) => {
    try {
      const response = await api.get(`/favorites/check/${trackId}`);
      return response.data;
    } catch {
      return { isFavorite: false, savedAt: null };
    }
  },
};

export default favoritesService;