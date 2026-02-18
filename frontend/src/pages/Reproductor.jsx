import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import spotifyService from '../services/spotifyService';
import ArtistProfile from './ArtistProfile';
import './Reproductor.css';

function Reproductor() {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [error, setError] = useState('');
  const [youtubeLoading, setYoutubeLoading] = useState(false);

  // ─── Estado artista ─────────────────────────────────────────────────────────
  const [topArtist, setTopArtist] = useState(null);       // artista destacado en búsqueda
  const [selectedArtist, setSelectedArtist] = useState(null); // artista cuyo perfil se muestra
  const [artistTracks, setArtistTracks] = useState([]);   // canciones del perfil del artista activo

  const ytPlayerRef = useRef(null);
  const ytContainerRef = useRef(null);
  const ytReadyRef = useRef(false);
  const progressInterval = useRef(null);
  const searchTimeout = useRef(null);
  const tracksRef = useRef([]);
  const artistTracksRef = useRef([]);
  const currentTrackRef = useRef(null);

  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { artistTracksRef.current = artistTracks; }, [artistTracks]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);

  // Cargar YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) { ytReadyRef.current = true; return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => { ytReadyRef.current = true; };
    return () => { window.onYouTubeIframeAPIReady = null; };
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await authService.verifyAuth();
        if (!userData) { navigate('/auth'); return; }
        setUser(userData);
        if (location.state?.isFirstLogin) {
          setShowWelcome(true);
          setTimeout(() => setShowWelcome(false), 5000);
        }
        await loadFeaturedTracks();
        setLoading(false);
      } catch (error) {
        navigate('/auth');
      }
    };
    checkAuth();
  }, [navigate, location]);

  useEffect(() => {
    return () => {
      clearInterval(progressInterval.current);
      if (ytPlayerRef.current) { try { ytPlayerRef.current.destroy(); } catch (_) {} }
    };
  }, []);

  const loadFeaturedTracks = async () => {
    try {
      setTracksLoading(true);
      setError('');
      setTopArtist(null);
      const data = await spotifyService.getFeatured();
      setTracks(data);
    } catch (err) {
      setError('No se pudieron cargar las canciones. Intenta de nuevo.');
    } finally {
      setTracksLoading(false);
    }
  };

  // ─── Búsqueda: canciones + artista en paralelo ───────────────────────────────
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    clearTimeout(searchTimeout.current);

    if (value.trim() === '') {
      setTopArtist(null);
      setSelectedArtist(null);
      setArtistTracks([]);
      loadFeaturedTracks();
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        setTracksLoading(true);
        setError('');
        setSelectedArtist(null);

        // Buscar canciones y artista en paralelo
        const [trackResults, artistResults] = await Promise.all([
          spotifyService.search(value),
          spotifyService.searchArtists(value),
        ]);

        setTracks(trackResults);
        // Mostrar el artista más relevante si su nombre coincide razonablemente
        if (artistResults && artistResults.length > 0) {
          const top = artistResults[0];
          const nameMatch = top.name.toLowerCase().includes(value.toLowerCase()) ||
                            value.toLowerCase().includes(top.name.toLowerCase().split(' ')[0]);
          setTopArtist(nameMatch ? top : null);
        } else {
          setTopArtist(null);
        }
      } catch (err) {
        setError('Error al buscar canciones.');
      } finally {
        setTracksLoading(false);
      }
    }, 500);
  };

  // ─── YouTube helpers ─────────────────────────────────────────────────────────
  const startProgressTracking = () => {
    clearInterval(progressInterval.current);
    progressInterval.current = setInterval(() => {
      if (ytPlayerRef.current && ytReadyRef.current) {
        try {
          const t = ytPlayerRef.current.getCurrentTime?.() || 0;
          const d = ytPlayerRef.current.getDuration?.() || 0;
          setCurrentTime(t);
          if (d > 0) setDuration(d);
        } catch (_) {}
      }
    }, 500);
  };

  const loadYoutubePlayer = (videoId, track) => {
    return new Promise((resolve) => {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch (_) {}
        ytPlayerRef.current = null;
      }
      if (ytContainerRef.current) {
        ytContainerRef.current.innerHTML = '';
        const div = document.createElement('div');
        div.id = 'yt-player-inner';
        ytContainerRef.current.appendChild(div);
      }

      const waitForYT = () => {
        if (!window.YT || !window.YT.Player) { setTimeout(waitForYT, 200); return; }
        const vol = volume;
        ytPlayerRef.current = new window.YT.Player('yt-player-inner', {
          height: '0', width: '0', videoId,
          playerVars: { autoplay: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, fs: 0 },
          events: {
            onReady: (event) => {
              event.target.setVolume(vol);
              event.target.playVideo();
              setIsPlaying(true);
              setCurrentTime(0);
              startProgressTracking();
              resolve();
            },
            onStateChange: (event) => {
              const YTS = window.YT.PlayerState;
              if (event.data === YTS.PLAYING) {
                setIsPlaying(true);
                startProgressTracking();
              } else if (event.data === YTS.PAUSED) {
                setIsPlaying(false);
                clearInterval(progressInterval.current);
              } else if (event.data === YTS.ENDED) {
                setIsPlaying(false);
                clearInterval(progressInterval.current);
                const allTracks = artistTracksRef.current.length > 0 ? artistTracksRef.current : tracksRef.current;
                const ct = currentTrackRef.current;
                if (!ct || allTracks.length === 0) return;
                const idx = allTracks.findIndex((t) => t.id === ct.id);
                const next = allTracks[(idx + 1) % allTracks.length];
                if (next) playTrackInternal(next);
              }
            },
            onError: () => {
              setIsPlaying(false);
              setYoutubeLoading(false);
              setError('No se pudo reproducir. Intenta con otra canción.');
              setTimeout(() => setError(''), 4000);
              resolve();
            },
          },
        });
      };
      waitForYT();
    });
  };

  const playTrackInternal = async (track) => {
    setCurrentTrack(track);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setYoutubeLoading(true);
    const videoId = await spotifyService.getYoutubeVideoId(track.name, track.artist);
    if (!videoId) {
      setYoutubeLoading(false);
      setError(`No se encontró "${track.name}" en YouTube.`);
      setTimeout(() => setError(''), 4000);
      return;
    }
    setYoutubeLoading(false);
    await loadYoutubePlayer(videoId, track);
  };

  const playTrack = async (track) => {
    if (currentTrack?.id === track.id) { togglePlay(); return; }
    await playTrackInternal(track);
  };

  const togglePlay = () => {
    if (!ytPlayerRef.current || !currentTrack) return;
    try {
      if (isPlaying) { ytPlayerRef.current.pauseVideo(); }
      else { ytPlayerRef.current.playVideo(); }
    } catch (_) {}
  };

  const playNext = () => {
    // Si hay canciones del artista activo, navegar por esa lista
    const activeList = artistTracks.length > 0 ? artistTracks : tracks;
    if (!currentTrack || activeList.length === 0) return;
    const idx = activeList.findIndex((t) => t.id === currentTrack.id);
    playTrack(activeList[(idx + 1) % activeList.length]);
  };

  const playPrev = () => {
    const activeList = artistTracks.length > 0 ? artistTracks : tracks;
    if (!currentTrack || activeList.length === 0) return;
    const idx = activeList.findIndex((t) => t.id === currentTrack.id);
    playTrack(activeList[(idx - 1 + activeList.length) % activeList.length]);
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (ytPlayerRef.current) { try { ytPlayerRef.current.seekTo(time, true); } catch (_) {} }
  };

  const handleVolume = (e) => {
    const vol = parseInt(e.target.value, 10);
    setVolume(vol);
    if (ytPlayerRef.current) { try { ytPlayerRef.current.setVolume(vol); } catch (_) {} }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleLogout = async () => {
    clearInterval(progressInterval.current);
    if (ytPlayerRef.current) { try { ytPlayerRef.current.stopVideo(); } catch (_) {} }
    await authService.logout();
    navigate('/auth');
  };

  // ─── Pantalla de carga ───────────────────────────────────────────────────────
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
          <h1 className="welcome-title">Bienvenido a ShafaFy</h1>
          <p className="welcome-subtitle">Tu música, sin límites</p>
          <div className="welcome-features">
            <div className="feature-item"><span className="feature-icon">🎵</span><h3>Millones de canciones</h3><p>Accede a todo el catálogo</p></div>
            <div className="feature-item"><span className="feature-icon">🎧</span><h3>Alta calidad</h3><p>Sonido nítido siempre</p></div>
            <div className="feature-item"><span className="feature-icon">🚫</span><h3>Sin anuncios</h3><p>Disfruta sin interrupciones</p></div>
          </div>
          <div className="welcome-loading">
            <div className="loading-bar"><div className="loading-progress"></div></div>
            <p>Preparando tu experiencia musical...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reproductor-page">

      {/* Player YouTube invisible */}
      <div ref={ytContainerRef} style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: 0, height: 0, overflow: 'hidden' }} />

      {/* Header */}
      <header className="reproductor-header">
        <div className="header-logo">
          <span className="logo-text">Shafa<span className="logo-accent">Fy</span></span>
        </div>
        <div className="search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
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

      {/* ─── Contenido central ─────────────────────────────────────────────────── */}
      <main className="reproductor-content">

        {/* ── Vista perfil de artista ── */}
        {selectedArtist ? (
          <ArtistProfile
            artistId={selectedArtist}
            onClose={() => { setSelectedArtist(null); setArtistTracks([]); }}
            onPlayTrack={playTrack}
            onTracksLoaded={setArtistTracks}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            youtubeLoading={youtubeLoading}
          />
        ) : (
          <div className="content-container">

            {/* Título */}
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

            {tracksLoading ? (
              <div className="tracks-loading">
                {[...Array(8)].map((_, i) => <div key={i} className="track-skeleton" />)}
              </div>
            ) : (
              <>
                {/* ── Tarjeta de artista destacado ── */}
                {topArtist && (
                  <div className="artist-result-card" onClick={() => setSelectedArtist(topArtist.id)}>
                    <div className="artist-result-img-wrap">
                      {topArtist.image ? (
                        <img src={topArtist.image} alt={topArtist.name} className="artist-result-img" />
                      ) : (
                        <div className="artist-result-img-placeholder">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="artist-result-info">
                      <span className="artist-result-label">Artista</span>
                      <p className="artist-result-name">{topArtist.name}</p>
                      {topArtist.genres.length > 0 && (
                        <p className="artist-result-genre">{topArtist.genres.slice(0, 2).join(', ')}</p>
                      )}
                      <p className="artist-result-followers">
                        {spotifyService.formatFollowers(topArtist.followers)} seguidores
                      </p>
                    </div>
                    <div className="artist-result-action">
                      <span>Ver artista</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </div>
                )}

                {/* ── Lista canciones ── */}
                {topArtist && tracks.length > 0 && (
                  <p className="songs-section-label">Canciones</p>
                )}
                <div className="tracks-grid">
                  {tracks.map((track) => (
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
                          {currentTrack?.id === track.id && youtubeLoading ? (
                            <svg viewBox="0 0 50 50" width="28" height="28">
                              <circle cx="25" cy="25" r="18" fill="none" stroke="white" strokeWidth="4" strokeDasharray="80" strokeLinecap="round">
                                <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite"/>
                              </circle>
                            </svg>
                          ) : currentTrack?.id === track.id && isPlaying ? (
                            <div className="playing-indicator"><span/><span/><span/></div>
                          ) : (
                            <svg className="play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                          )}
                        </div>
                      </div>
                      <div className="track-info">
                        <p className="track-name">{track.name}</p>
                        <p className="track-artist">{track.artist}</p>
                        <p className="track-album">{track.album}</p>
                      </div>
                      <div className="track-duration">{spotifyService.formatDuration(track.duration)}</div>
                    </div>
                  ))}
                </div>

                {tracks.length === 0 && !error && (
                  <div className="no-results">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <p>No se encontraron canciones para "{searchQuery}"</p>
                  </div>
                )}
              </>
            )}

          </div>
        )}
      </main>

      {/* ─── Player inferior ───────────────────────────────────────────────────── */}
      {currentTrack && (
        <div className="player-bar">
          <div className="player-track-info">
            {currentTrack.albumImage && (
              <img src={currentTrack.albumImage} alt="cover" className="player-cover" />
            )}
            <div>
              <p className="player-track-name">{currentTrack.name}</p>
              <p className="player-track-artist">{currentTrack.artist}</p>
            </div>
          </div>

          <div className="player-controls">
            <button className="ctrl-btn" onClick={playPrev} disabled={youtubeLoading}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
            </button>
            <button className="ctrl-btn play-pause" onClick={togglePlay} disabled={youtubeLoading}>
              {youtubeLoading ? (
                <svg viewBox="0 0 50 50" width="22" height="22">
                  <circle cx="25" cy="25" r="18" fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray="80" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite"/>
                  </circle>
                </svg>
              ) : isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>
            <button className="ctrl-btn" onClick={playNext} disabled={youtubeLoading}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
            <div className="progress-section">
              <span className="time-label">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 100} step="1" value={currentTime} onChange={handleSeek} className="progress-bar" />
              <span className="time-label">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="player-volume">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
            <input type="range" min="0" max="100" step="5" value={volume} onChange={handleVolume} className="volume-bar" />
          </div>
        </div>
      )}
    </div>
  );
}

export default Reproductor;