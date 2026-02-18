//routes/spotify.js
const express = require('express');
const router = express.Router();
const spotifyController = require('../controllers/spotifyController');
const { protect } = require('../middleware/authMiddleware');

// Todas las rutas de Spotify requieren autenticación
router.use(protect);

// GET /api/spotify/search?q=bad+bunny&limit=20
router.get('/search', spotifyController.searchTracks);

// GET /api/spotify/featured
router.get('/featured', spotifyController.getFeaturedTracks);

// GET /api/spotify/with-preview
router.get('/with-preview', spotifyController.getTracksWithPreview);

// GET /api/spotify/track/:id
router.get('/track/:id', spotifyController.getTrackById);

// ─── Rutas de Artistas ────────────────────────────────────────────────────────
// GET /api/spotify/artist/search?q=bad+bunny
router.get('/artist/search', spotifyController.searchArtist);

// GET /api/spotify/artist/:id
router.get('/artist/:id', spotifyController.getArtistProfile);

module.exports = router;