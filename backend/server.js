const http = require('http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const foroRealtime = require('./services/foroRealtime');

// Cargar variables de entorno
dotenv.config();

// Inicializar Express
const app = express();

// Conectar a la base de datos
connectDB();

const ORIGENES_CORS = [
    'http://localhost:5173',
    'https://shafafy-production-frontend.up.railway.app',
];

// Middlewares
app.use(cors({
    origin: ORIGENES_CORS,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Rutas ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/spotify', require('./routes/spotify')); 
app.use('/api/youtube', require('./routes/youtube'));
app.use('/api', require('./routes/index'));
app.use('/api/history', require('./routes/history'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/graph',     require('./routes/graph')); 
app.use('/api/forum',     require('./routes/forum'));
app.use('/api/recommendations', require('./routes/recommendations'));

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

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ORIGENES_CORS,
        credentials: true,
        methods: ['GET', 'POST'],
    },
});

foroRealtime.inicializar(io);

// Puerto
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`📡 Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 Socket.IO activo para el foro`);
    console.log(`🎵 Spotify integrado`);
});