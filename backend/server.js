const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

// Cargar variables de entorno
dotenv.config();

// Inicializar Express
const app = express();

// Conectar a la base de datos
connectDB();

// Middlewares
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://shafafy-production-frontend.up.railway.app'
    ],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Rutas ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/spotify', require('./routes/spotify')); 
app.use('/api', require('./routes/index'));

// Ruta de prueba (raíz)
app.get('/', (req, res) => {
    res.json({ 
        message: '🎵 Bienvenido a ShafaFy API',
        status: 'online',
        version: '1.0.0'
    });
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Ruta no encontrada',
        path: req.url 
    });
});

// Puerto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`📡 Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🎵 Spotify integrado`);
});