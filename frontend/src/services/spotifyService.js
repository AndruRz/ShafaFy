import api from '../config/api';

const spotifyService = {
  // Buscar canciones por texto
  search: async (query, limit = 20) => {
    try {
      const response = await api.get('/spotify/search', {
        params: { q: query, limit },
      });
      return response.data.tracks;
    } catch (error) {
      throw error.response?.data || { message: 'Error al buscar canciones' };
    }
  },

  // Obtener canciones destacadas (inicio)
  getFeatured: async () => {
    try {
      const response = await api.get('/spotify/featured');
      return response.data.tracks;
    } catch (error) {
      throw error.response?.data || { message: 'Error al cargar canciones' };
    }
  },

  // Obtener canción por ID
  getTrack: async (id) => {
    try {
      const response = await api.get(`/spotify/track/${id}`);
      return response.data.track;
    } catch (error) {
      throw error.response?.data || { message: 'Error al cargar la canción' };
    }
  },

  // Formatear duración de ms a mm:ss
  formatDuration: (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  },
};

export default spotifyService;