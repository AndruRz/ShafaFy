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

  // ─── NUEVO: Canciones recomendadas por filtrado colaborativo (tu propia BD) ───
  // Llama primero al pool colaborativo. Si está vacío, cae en el fallback de Spotify.
  getRecommendedTracks: async () => {
    try {
      // 1. Intentar pool colaborativo propio
      const collab = await api.get('/recommendations/tracks');
      if (collab.data?.tracks?.length > 0) {
        return collab.data.tracks;
      }
      // 2. Fallback: recomendaciones vía grafo + Spotify
      const fallback = await api.get('/graph/recommended-tracks');
      return (fallback.data?.tracks || []).map(t => ({
        ...t,
        // Normalizar campos que vienen distintos desde Spotify
        trackId:    t.trackId    || t.id,
        trackName:  t.trackName  || t.name,
        artistName: t.artistName || t.artist,
      }));
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

  // Datos del grafo de artistas para visualización D3
  getGraphData: async () => {
    try {
      const response = await api.get('/graph/data');
      return response.data.graph || { nodes: [], edges: [] };
    } catch {
      return { nodes: [], edges: [] };
    }
  },

  // ─── NUEVO: Datos del grafo colaborativo de canciones recomendadas ────────────
  // Devuelve los nodos (mis artistas + vecinos) y aristas para el GraphModal
  // de la sección "Canciones recomendadas"
  getRecommendationGraphData: async () => {
    try {
      // Reutilizamos los datos del grafo general de artistas
      // porque ya contiene las aristas colistened con sus pesos y users
      const response = await api.get('/graph/data');
      return response.data.graph || { nodes: [], edges: [] };
    } catch {
      return { nodes: [], edges: [] };
    }
  },
};

export default graphService;