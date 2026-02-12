import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import spotifyService from '../services/spotifyService';
import './Reproductor.css';

function Reproductor() {
  const location = useLocation();
  const navigate = useNavigate();

  // ─── Estado de usuario ──────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  // ─── Estado del reproductor ─────────────────────────────────────────────────
  const [tracks, setTracks] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [error, setError] = useState('');

  const audioRef = useRef(null);
  const searchTimeout = useRef(null);

  // ─── Verificar autenticación y cargar canciones ─────────────────────────────
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await authService.verifyAuth();
        if (!userData) {
          navigate('/auth');
          return;
        }
        setUser(userData);

        if (location.state?.isFirstLogin) {
          setShowWelcome(true);
          setTimeout(() => setShowWelcome(false), 5000);
        }

        // Cargar canciones destacadas al inicio
        await loadFeaturedTracks();
        setLoading(false);
      } catch (error) {
        console.error('Error al verificar autenticación:', error);
        navigate('/auth');
      }
    };

    checkAuth();
  }, [navigate, location]);

  // ─── Cargar canciones destacadas ────────────────────────────────────────────
  const loadFeaturedTracks = async () => {
    try {
      setTracksLoading(true);
      setError('');
      const data = await spotifyService.getFeatured();
      setTracks(data);
    } catch (err) {
      setError('No se pudieron cargar las canciones. Intenta de nuevo.');
    } finally {
      setTracksLoading(false);
    }
  };

  // ─── Buscar canciones con debounce ───────────────────────────────────────────
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    clearTimeout(searchTimeout.current);

    if (value.trim() === '') {
      loadFeaturedTracks();
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        setTracksLoading(true);
        setError('');
        const results = await spotifyService.search(value);
        setTracks(results);
      } catch (err) {
        setError('Error al buscar canciones.');
      } finally {
        setTracksLoading(false);
      }
    }, 500);
  };

  // ─── Reproducir una canción ──────────────────────────────────────────────────
  const playTrack = (track) => {
    if (!track.previewUrl) {
      alert('Esta canción no tiene preview disponible. Ábrela en Spotify.');
      window.open(track.spotifyUrl, '_blank');
      return;
    }

    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }

    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(0);

    if (audioRef.current) {
      audioRef.current.src = track.previewUrl;
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  };

  // ─── Play / Pause ────────────────────────────────────────────────────────────
  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
    setIsPlaying(!isPlaying);
  };

  // ─── Siguiente / Anterior ─────────────────────────────────────────────────
  const playNext = () => {
    if (!currentTrack || tracks.length === 0) return;
    const idx = tracks.findIndex((t) => t.id === currentTrack.id);
    const next = tracks[(idx + 1) % tracks.length];
    playTrack(next);
  };

  const playPrev = () => {
    if (!currentTrack || tracks.length === 0) return;
    const idx = tracks.findIndex((t) => t.id === currentTrack.id);
    const prev = tracks[(idx - 1 + tracks.length) % tracks.length];
    playTrack(prev);
  };

  // ─── Eventos del audio ───────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration);
    const onEnded = () => { setIsPlaying(false); playNext(); };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, [currentTrack, tracks]);

  // ─── Cambiar tiempo de la canción ────────────────────────────────────────────
  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  // ─── Cambiar volumen ──────────────────────────────────────────────────────────
  const handleVolume = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) audioRef.current.volume = vol;
  };

  // ─── Formatear tiempo ─────────────────────────────────────────────────────────
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleLogout = async () => {
    if (audioRef.current) audioRef.current.pause();
    await authService.logout();
    navigate('/auth');
  };

  // ─── Pantallas de carga y bienvenida (igual que antes) ───────────────────────
  if (loading) {
    return (
      <div className="reproductor-loading">
        <div className="loading-spinner">
          <svg className="spinner-circle" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
          </svg>
        </div>
        <p>Cargando...</p>
      </div>
    );
  }

  if (showWelcome) {
    return (
      <div className="welcome-screen">
        <div className="welcome-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
        <div className="welcome-content">
          <div className="welcome-logo">
            <span className="logo-text">Shafa<span className="logo-accent">Fy</span></span>
          </div>
          <h1 className="welcome-title">¡Bienvenido, {user?.fullName?.split(' ')[0]}! 🎉</h1>
          <div className="welcome-benefits">
            <div className="benefit-item">
              <div className="benefit-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18V5l12-2v13M9 18l-7 2V7l7-2M9 18l12-2M9 9l12-2"/>
                </svg>
              </div>
              <div className="benefit-text">
                <h3>Música ilimitada</h3>
                <p>Accede a millones de canciones</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
              </div>
              <div className="benefit-text">
                <h3>Listas personalizadas</h3>
                <p>Crea y comparte tus playlists</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <div className="benefit-text">
                <h3>Sin anuncios</h3>
                <p>Disfruta sin interrupciones</p>
              </div>
            </div>
          </div>
          <div className="welcome-loading">
            <div className="loading-bar">
              <div className="loading-progress"></div>
            </div>
            <p>Preparando tu experiencia musical...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Pantalla principal ───────────────────────────────────────────────────────
  return (
    <div className="reproductor-page">
      {/* Audio element oculto */}
      <audio ref={audioRef} />

      {/* Header */}
      <header className="reproductor-header">
        <div className="header-logo">
          <span className="logo-text">Shafa<span className="logo-accent">Fy</span></span>
        </div>

        {/* Barra de búsqueda */}
        <div className="search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar canciones, artistas..."
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>

        <div className="header-user">
          <div className="user-avatar">{user?.fullName?.charAt(0).toUpperCase()}</div>
          <span className="user-name">{user?.username}</span>
          <button className="logout-btn" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Salir
          </button>
        </div>
      </header>

      {/* Contenido */}
      <main className="reproductor-content">
        <div className="content-container">
          {/* Título de sección */}
          <div className="section-header">
            <h2>{searchQuery ? `Resultados: "${searchQuery}"` : '🔥 Canciones destacadas'}</h2>
            {!searchQuery && (
              <button className="refresh-btn" onClick={loadFeaturedTracks}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6M1 20v-6h6"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                Refrescar
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="error-message">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Lista de canciones */}
          {tracksLoading ? (
            <div className="tracks-loading">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="track-skeleton" />
              ))}
            </div>
          ) : (
            <div className="tracks-grid">
              {tracks.map((track, index) => (
                <div
                  key={track.id}
                  className={`track-card ${currentTrack?.id === track.id ? 'active' : ''}`}
                  onClick={() => playTrack(track)}
                >
                  <div className="track-image-wrapper">
                    {track.albumImage ? (
                      <img src={track.albumImage} alt={track.album} className="track-image" />
                    ) : (
                      <div className="track-image-placeholder">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                      </div>
                    )}
                    <div className="track-overlay">
                      {currentTrack?.id === track.id && isPlaying ? (
                        <div className="playing-indicator">
                          <span/><span/><span/>
                        </div>
                      ) : (
                        <svg className="play-icon" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="track-info">
                    <p className="track-name">{track.name}</p>
                    <p className="track-artist">{track.artist}</p>
                    <p className="track-album">{track.album}</p>
                    {!track.previewUrl && (
                      <span className="no-preview">Solo en Spotify</span>
                    )}
                  </div>

                  <div className="track-duration">
                    {spotifyService.formatDuration(track.duration)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tracks.length === 0 && !tracksLoading && !error && (
            <div className="no-results">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <p>No se encontraron canciones para "{searchQuery}"</p>
            </div>
          )}
        </div>
      </main>

      {/* ─── Reproductor inferior ─────────────────────────────────────────────── */}
      {currentTrack && (
        <div className="player-bar">
          {/* Info de la canción */}
          <div className="player-track-info">
            {currentTrack.albumImage && (
              <img src={currentTrack.albumImage} alt="cover" className="player-cover" />
            )}
            <div>
              <p className="player-track-name">{currentTrack.name}</p>
              <p className="player-track-artist">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Controles */}
          <div className="player-controls">
            <button className="ctrl-btn" onClick={playPrev}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
            </button>

            <button className="ctrl-btn play-pause" onClick={togglePlay}>
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>

            <button className="ctrl-btn" onClick={playNext}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>

            {/* Barra de progreso */}
            <div className="progress-section">
              <span className="time-label">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 30}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="progress-bar"
              />
              <span className="time-label">{formatTime(duration || 30)}</span>
            </div>
          </div>

          {/* Volumen */}
          <div className="player-volume">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolume}
              className="volume-bar"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Reproductor;