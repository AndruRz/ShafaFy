// routes/history.js
const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const { protect } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(protect);

// POST /api/history/play → Registrar una reproducción
router.post('/play', historyController.registerPlay);

// GET /api/history/top-tracks → Top 10 canciones del mes actual
router.get('/top-tracks', historyController.getTopTracks);

// GET /api/history/top-artists → Top 10 artistas del mes actual
router.get('/top-artists', historyController.getTopArtists);

// GET /api/history/recent → Últimas 20 canciones reproducidas
router.get('/recent', historyController.getRecentTracks);

module.exports = router;