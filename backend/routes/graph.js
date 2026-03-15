// routes/graph.js
const express         = require('express');
const router          = express.Router();
const graphController = require('../controllers/graphController');
const { protect }     = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(protect);

// GET /api/graph/recent-tracks → últimas 10 canciones ("Seguir escuchando")
router.get('/recent-tracks', graphController.getRecentTracks);

// GET /api/graph/related-artists → artistas relacionados al historial del usuario
router.get('/related-artists', graphController.getRelatedArtists);

// GET /api/graph/recommended-tracks?artistId=xxx&artistName=yyy
// → canciones recomendadas por colaboraciones del artista actual
router.get('/recommended-tracks', graphController.getRecommendedTracks);

// GET /api/graph/may-like → "Artistas que te pueden gustar" (filtrado colaborativo)
router.get('/may-like', graphController.getMayLike);

// GET /api/graph/data → datos del grafo para visualización D3.js
router.get('/data', graphController.getGraphData);

module.exports = router;