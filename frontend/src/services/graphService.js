// src/services/graphService.js
import api from '../config/api';

const graphService = {

  // Últimas 10 canciones reproducidas — "Sigue escuchando"
  getRecentTracks: async () => {
    try {
      const response = await api.get('/graph/recent-tracks');
      return response.data.tracks || [];
    } catch {
      return [];
    }
  },

  // Artistas relacionados al historial del usuario (grafo BFS)
  getRelatedArtists: async () => {
    try {
      const response = await api.get('/graph/related-artists');
      return response.data.artists || [];
    } catch {
      return [];
    }
  },

  // Canciones recomendadas por colaboraciones del artista actual
  getRecommendedTracks: async (artistId, artistName) => {
    try {
      const response = await api.get('/graph/recommended-tracks', {
        params: { artistId, artistName },
      });
      return response.data.tracks || [];
    } catch {
      return [];
    }
  },

  // Artistas que te pueden gustar (filtrado colaborativo)
  getMayLike: async () => {
    try {
      const response = await api.get('/graph/may-like');
      return response.data.artists || [];
    } catch {
      return [];
    }
  },

  // Datos del grafo para visualización D3
  getGraphData: async () => {
    try {
      const response = await api.get('/graph/data');
      return response.data.graph || { nodes: [], edges: [] };
    } catch {
      return { nodes: [], edges: [] };
    }
  },
};

export default graphService;