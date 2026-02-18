// routes/youtube.js
const express = require('express');
const router = express.Router();
const youtubeController = require('../controllers/youtubeController');
const { protect } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(protect);

// GET /api/youtube/search?q=nombre+artista
router.get('/search', youtubeController.searchVideo);

module.exports = router;