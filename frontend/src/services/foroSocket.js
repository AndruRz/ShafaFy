import { io } from 'socket.io-client';
import authService from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/** URL del mismo host que la API, sin el sufijo /api */
export function obtenerUrlBaseSocket() {
  return import.meta.env.VITE_SOCKET_URL || API_URL.replace(/\/api\/?$/, '');
}

let instancia = null;

/**
 * Cliente Socket.IO singleton (reconexión automática; al reconectar se deben volver a unir las salas).
 */
export function obtenerClienteSocketForo() {
  const url = obtenerUrlBaseSocket();
  if (!instancia) {
    instancia = io(url, {
      auth: (callback) => {
        callback({ token: authService.getToken() });
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return instancia;
}

/** Tras cerrar sesión o cambiar de cuenta, desecha la conexión para que el próximo token se use al conectar. */
export function reiniciarClienteSocketForo() {
  if (instancia) {
    instancia.removeAllListeners();
    instancia.disconnect();
    instancia = null;
  }
}
