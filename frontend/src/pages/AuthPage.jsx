// src/pages/AuthPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import './css/AuthPage.css';

function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    username: ''
  });
  const [passwordStrength, setPasswordStrength] = useState({
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false,
    hasMinLength: false,
    score: 0
  });
  const [passwordMatch, setPasswordMatch] = useState(true);

  // Verificar si ya está autenticado al cargar el componente
  useEffect(() => {
    const checkAuth = async () => {
      if (authService.isAuthenticated()) {
        navigate('/reproductor');
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!isLogin && formData.password) {
      checkPasswordStrength(formData.password);
    }
  }, [formData.password, isLogin]);

  useEffect(() => {
    if (!isLogin && formData.confirmPassword) {
      setPasswordMatch(formData.password === formData.confirmPassword);
    }
  }, [formData.password, formData.confirmPassword, isLogin]);

  const checkPasswordStrength = (password) => {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const hasMinLength = password.length >= 6;

    const score = [hasUppercase, hasLowercase, hasNumber, hasSpecial, hasMinLength].filter(Boolean).length;

    setPasswordStrength({
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecial,
      hasMinLength,
      score
    });
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      emailOrUsername: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      username: ''
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPasswordMatch(true);
    setError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Limpiar error al escribir
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        // LOGIN
        const response = await authService.login({
          emailOrUsername: formData.emailOrUsername,
          password: formData.password
        });
        
        console.log('Login exitoso:', response);
        
        // Redirigir al reproductor (sin pantalla de bienvenida)
        navigate('/reproductor', { 
          state: { isFirstLogin: false } 
        });
        
      } else {
        // REGISTRO
        
        // Validación de contraseña en registro
        if (passwordStrength.score < 5) {
          setError('La contraseña debe cumplir con todos los requisitos de seguridad');
          setLoading(false);
          return;
        }
        
        if (!passwordMatch) {
          setError('Las contraseñas no coinciden');
          setLoading(false);
          return;
        }
        
        const response = await authService.register({
          fullName: formData.fullName,
          username: formData.username,
          emailOrUsername: formData.emailOrUsername,
          password: formData.password
        });
        
        console.log('Registro exitoso:', response);
        
        // Redirigir al reproductor con pantalla de bienvenida
        navigate('/reproductor', { 
          state: { isFirstLogin: true } 
        });
      }
    } catch (err) {
      console.error('Error en autenticación:', err);
      setError(err.message || 'Error al procesar la solicitud');
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength.score <= 2) return '#EF4444';
    if (passwordStrength.score <= 3) return '#F59E0B';
    if (passwordStrength.score <= 4) return '#10B981';
    return '#1DB954';
  };

  const getStrengthWidth = () => {
    return `${(passwordStrength.score / 5) * 100}%`;
  };

  return (
    <div className="auth-page">
      {/* Fondo animado igual al Hero */}
      <div className="auth-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Logo en la esquina superior izquierda */}
      <div className="auth-logo">
        <span className="logo-text">Shafa<span className="logo-accent">Fy</span></span>
      </div>

      {/* Contenedor principal */}
      <div className="auth-container">
        <div className="auth-card">
          {/* Header de la tarjeta */}
          <div className="auth-header">
            <h1 className="auth-title">
              {isLogin ? 'Bienvenido de nuevo' : 'Crear cuenta'}
            </h1>
            <p className="auth-subtitle">
              {isLogin 
                ? 'Inicia sesión para continuar con tu música' 
                : 'Únete a ShafaFy y descubre tu música'}
            </p>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="auth-error">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Formulario */}
          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Campos de registro */}
            {!isLogin && (
              <>
                {/* Nombre completo */}
                <div className="form-group">
                  <label htmlFor="fullName" className="form-label">
                    Nombre completo
                  </label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      className="form-input"
                      placeholder="Ingresa tu nombre completo"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required={!isLogin}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Nombre de usuario */}
                <div className="form-group">
                  <label htmlFor="username" className="form-label">
                    Nombre de usuario
                  </label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="8.5" cy="7" r="4"/>
                      <polyline points="17 11 19 13 23 9"/>
                    </svg>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      className="form-input"
                      placeholder="Elige un nombre de usuario"
                      value={formData.username}
                      onChange={handleInputChange}
                      required={!isLogin}
                      disabled={loading}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Campo de email o username (para login) */}
            <div className="form-group">
              <label htmlFor="emailOrUsername" className="form-label">
                {isLogin ? 'Correo electrónico o nombre de usuario' : 'Correo electrónico'}
              </label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  type={isLogin ? "text" : "email"}
                  id="emailOrUsername"
                  name="emailOrUsername"
                  className="form-input"
                  placeholder={isLogin ? "tu@email.com o usuario" : "tu@email.com"}
                  value={formData.emailOrUsername}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Campo de contraseña */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Contraseña
              </label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  disabled={loading}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Campo de confirmar contraseña (solo en registro) */}
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirmar contraseña
                </label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    className="form-input"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required={!isLogin}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                {!passwordMatch && formData.confirmPassword && (
                  <div className="password-error">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                    <span>Las contraseñas no coinciden</span>
                  </div>
                )}
              </div>
            )}

            {/* Indicador de fortaleza de contraseña */}
            {!isLogin && formData.password && passwordStrength.score < 5 && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className="strength-fill" 
                    style={{ 
                      width: getStrengthWidth(),
                      backgroundColor: getStrengthColor()
                    }}
                  />
                </div>
                <div className="strength-requirements">
                  <div className={`requirement ${passwordStrength.hasUppercase ? 'met' : ''}`}>
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span>Una mayúscula</span>
                  </div>
                  <div className={`requirement ${passwordStrength.hasLowercase ? 'met' : ''}`}>
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span>Una minúscula</span>
                  </div>
                  <div className={`requirement ${passwordStrength.hasNumber ? 'met' : ''}`}>
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span>Un número</span>
                  </div>
                  <div className={`requirement ${passwordStrength.hasSpecial ? 'met' : ''}`}>
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span>Un carácter especial</span>
                  </div>
                  <div className={`requirement ${passwordStrength.hasMinLength ? 'met' : ''}`}>
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span>Mínimo 6 caracteres</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recordar sesión / Olvidé contraseña */}
            {isLogin && (
              <div className="form-extras">
                <label className="checkbox-label">
                  <input type="checkbox" className="checkbox-input" disabled={loading} />
                  <span>Recordarme</span>
                </label>
                <a href="#" className="forgot-link">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            )}

            {/* Botón de submit */}
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? (
                <>
                  <svg className="spinner" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75"/>
                  </svg>
                  <span>{isLogin ? 'Iniciando sesión...' : 'Creando cuenta...'}</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Iniciar sesión' : 'Crear cuenta'}</span>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Toggle entre Login y Registro */}
          <div className="auth-toggle">
            <p>
              {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
              {' '}
              <button 
                type="button" 
                className="toggle-btn"
                onClick={toggleAuthMode}
                disabled={loading}
              >
                {isLogin ? 'Regístrate' : 'Inicia sesión'}
              </button>
            </p>
          </div>

          {/* Volver al inicio */}
          <div className="back-home">
            <a href="/" className="back-link">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 10L5 10M5 10L10 5M5 10L10 15" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Volver al inicio
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;