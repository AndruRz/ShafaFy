import api from '../config/api';

// Servicio de autenticación
const authService = {
  // Registro de usuario
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', {
        fullName: userData.fullName,
        username: userData.username,
        email: userData.emailOrUsername,
        password: userData.password
      });
      
      // Guardar token en localStorage
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al registrar usuario' };
    }
  },

  // Login de usuario
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', {
        emailOrUsername: credentials.emailOrUsername,
        password: credentials.password
      });
      
      // Guardar token en localStorage
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al iniciar sesión' };
    }
  },

  // Logout
  logout: async () => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (error) {
      // Limpiar localStorage aunque falle la petición
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  // Verificar si el usuario está autenticado
  verifyAuth: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return null;
      }
      
      const response = await api.get('/auth/verify');
      return response.data.user;
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
  },

  // Obtener token del localStorage
  getToken: () => {
    return localStorage.getItem('token');
  },

  // Obtener usuario del localStorage
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Verificar si hay token
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};

export default authService;