const express = require('express');
const router = express.Router();
const spotifyController = require('../controllers/spotifyController');
const { protect } = require('../middleware/authMiddleware');

// Todas las rutas de Spotify requieren que el usuario esté autenticado
router.use(protect);

// GET /api/spotify/search?q=bad+bunny&limit=20
router.get('/search', spotifyController.searchTracks);

// GET /api/spotify/featured
router.get('/featured', spotifyController.getFeaturedTracks);

// GET /api/spotify/track/:id
router.get('/track/:id', spotifyController.getTrackById);

module.exports = router;