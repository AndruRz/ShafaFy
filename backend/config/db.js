const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Construir la URI completa con el nombre de la base de datos
        const mongoURI = `${process.env.MONGODB_URI}ShafaFy-ED2?retryWrites=true&w=majority`;

        // Conectar a MongoDB (sin opciones deprecadas)
        const conn = await mongoose.connect(mongoURI);

        console.log(`✅ MongoDB Conectado: ${conn.connection.host}`);
        console.log(`📦 Base de Datos: ${conn.connection.name}`);
        console.log(`🌐 Puerto: ${conn.connection.port}`);
        
        // Manejo de eventos de la conexión
        mongoose.connection.on('error', (err) => {
            console.error('❌ Error de MongoDB:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️  MongoDB desconectado');
        });

        // Manejo de cierre graceful
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('🔴 MongoDB desconectado por cierre de aplicación');
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Error al conectar a MongoDB:', error.message);
        process.exit(1); // Salir con error
    }
};

module.exports = connectDB;