// routes/recommendations.js
const express  = require('express');
const router   = express.Router();
const recCtrl  = require('../controllers/trackRecommendationController');
const { protect } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(protect);

// ─── GET /api/recommendations/tracks ─────────────────────────────────────────
// Canciones recomendadas usando filtrado colaborativo puro (solo tu BD).
// Algoritmo: mis artistas → grafo → artistas vecinos → sus canciones en el pool
// → excluir lo que ya escuché → puntuar → top 20
router.get('/tracks', recCtrl.getRecommendedTracks);

// ─── GET /api/recommendations/pool-stats ─────────────────────────────────────
// Estadísticas del pool global de canciones (útil para debug / panel admin).
// Muestra total de canciones, total de plays y top 10 más escuchadas.
router.get('/pool-stats', recCtrl.getPoolStats);

module.exports = router;