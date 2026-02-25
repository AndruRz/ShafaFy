// routes/favorites.js
const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const { protect } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(protect);

// POST /api/favorites/toggle → agregar o quitar de favoritos
router.post('/toggle', favoritesController.toggle);

// GET /api/favorites → listar todos los favoritos del usuario
router.get('/', favoritesController.getFavorites);

// GET /api/favorites/check/:trackId → verificar si una canción es favorita
router.get('/check/:trackId', favoritesController.checkFavorite);

module.exports = router;