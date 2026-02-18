import api from '../config/api';

const spotifyService = {
  // Buscar canciones por texto (Spotify)
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

  // Obtener canciones destacadas
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

  // ─── Buscar artistas por nombre ───────────────────────────────────────────
  searchArtists: async (query) => {
    try {
      const response = await api.get('/spotify/artist/search', {
        params: { q: query },
      });
      return response.data.artists;
    } catch (error) {
      console.error('Error buscando artistas:', error);
      return [];
    }
  },

  // ─── Obtener perfil completo del artista ──────────────────────────────────
  getArtistProfile: async (artistId) => {
    try {
      const response = await api.get(`/spotify/artist/${artistId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al cargar el artista' };
    }
  },

  // ─── Buscar videoId en YouTube para reproducir ────────────────────────────
  getYoutubeVideoId: async (trackName, artistName) => {
    try {
      const query = `${trackName} ${artistName}`;
      const response = await api.get('/youtube/search', {
        params: { q: query },
      });
      return response.data.videoId;
    } catch (error) {
      console.error('Error buscando en YouTube:', error);
      return null;
    }
  },

  // Formatear duración de ms a mm:ss
  formatDuration: (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  },

  // Formatear número de seguidores
  formatFollowers: (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  },
};

export default spotifyService;