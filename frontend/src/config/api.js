import axios from 'axios';

// URL del backend - cambia según el entorno
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Crear instancia de axios con configuración base
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
    timeout: 10000, // 10 segundos de timeout
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // El servidor respondió con un error
            console.error('Error del servidor:', error.response.data);
            
            // Si el token expiró o es inválido, limpiar localStorage
            if (error.response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                // Opcional: redirigir al login
                // window.location.href = '/auth';
            }
        } else if (error.request) {
            // No hubo respuesta del servidor
            console.error('No se pudo conectar con el servidor');
        } else {
            // Error al configurar la petición
            console.error('Error:', error.message);
        }
        return Promise.reject(error);
    }
);

export default api;