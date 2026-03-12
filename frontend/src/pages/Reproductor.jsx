import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import spotifyService from '../services/spotifyService';
import historyService from '../services/historyService';
import favoritesService from '../services/favoritesService';
import ArtistProfile from './ArtistProfile';
import UserProfile from './UserProfile';
import MisCanciones from './MisCanciones';
import Reproductor_Movil from './Reproductor_Movil';
import { HistoryStack, PlayQueue } from '../data_structures/EstructurasLineales';
import { fetchFeaturedTracks, searchTracksAndArtists, getSuggestions } from '../data_structures/HashTablesTries';
import './css/Reproductor.css';

function Reproductor() {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser]                     = useState(null);
  const [loading, setLoading]               = useState(true);
  const [showWelcome, setShowWelcome]       = useState(false);
  const [tracks, setTracks]                 = useState([]);
  const [tracksLoading, setTracksLoading]   = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [suggestions, setSuggestions]       = useState([]);
  const [currentTrack, setCurrentTrack]     = useState(null);
  const [isPlaying, setIsPlaying]           = useState(false);
  const [currentTime, setCurrentTime]       = useState(0);
  const [duration, setDuration]             = useState(0);
  const [volume, setVolume]                 = useState(80);
  const [error, setError]                   = useState('');
  const [youtubeLoading, setYoutubeLoading] = useState(false);

  // ─── Artista ─────────────────────────────────────────────────────────────────
  const [topArtist, setTopArtist]                   = useState(null);
  const [selectedArtist, setSelectedArtist]         = useState(null);
  const [artistTracks, setArtistTracks]             = useState([]);
  const [searchArtistTracks, setSearchArtistTracks] = useState([]);

  // ─── Perfil usuario ──────────────────────────────────────────────────────────
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [userTracks, setUserTracks]           = useState([]);

  // ─── Favoritos ───────────────────────────────────────────────────────────────
  const [isFavorite, setIsFavorite]             = useState(false);
  const [favoriteLoading, setFavoriteLoading]   = useState(false);
  const [showMisCanciones, setShowMisCanciones] = useState(false);
  const [favTracks, setFavTracks]               = useState([]);

  // ─── Reproductor móvil pantalla completa ─────────────────────────────────────
  const [showMobilePlayer, setShowMobilePlayer] = useState(false);
  const lastTapRef                              = useRef(0);

  // ─── Animación slide ─────────────────────────────────────────────────────────
  const [slideDirection, setSlideDirection] = useState('');
  const slideTimeout                        = useRef(null);

  // ─── Refs ─────────────────────────────────────────────────────────────────────
  const ytPlayerRef      = useRef(null);
  const ytContainerRef   = useRef(null);
  const ytReadyRef       = useRef(false);
  const progressInterval = useRef(null);
  const searchTimeout    = useRef(null);
  const tracksRef        = useRef([]);
  const artistTracksRef  = useRef([]);
  const userTracksRef    = useRef([]);
  const favTracksRef     = useRef([]);
  const currentTrackRef  = useRef(null);
  const resultsRef       = useRef(null);
  const playerBarRef     = useRef(null);

  // ─── Estructuras lineales: Pila (historial) + Cola (reproducción) ─────────────
  const historyStack = useRef(new HistoryStack());
  const playQueue    = useRef(new PlayQueue());

  // ─── Gestos táctiles (swipe para cambiar canción) ────────────────────────────
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  // ─── Helper: dispara animación slide ─────────────────────────────────────────
  const triggerSlide = (direction) => {
    setSlideDirection('');
    clearTimeout(slideTimeout.current);
    slideTimeout.current = setTimeout(() => setSlideDirection(direction), 10);
  };

  // ─── Doble tap en portada → abre reproductor móvil ───────────────────────────
  const handleCoverDoubleTap = (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setShowMobilePlayer(true);
    }
    lastTapRef.current = now;
  };

  useEffect(() => {
    const playerBar = playerBarRef.current;
    if (!playerBar) return;

    const onTouchStart = (e) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchEnd = (e) => {
      if (touchStartX.current === null) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);

      if (Math.abs(deltaX) > 60 && deltaY < 40) {
        if (deltaX < 0) playNext();
        else            playPrev();
      }
      touchStartX.current = null;
      touchStartY.current = null;
    };

    playerBar.addEventListener('touchstart', onTouchStart, { passive: true });
    playerBar.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      playerBar.removeEventListener('touchstart', onTouchStart);
      playerBar.removeEventListener('touchend',   onTouchEnd);
    };
  }, [currentTrack, tracks, artistTracks, userTracks, favTracks]);

  useEffect(() => { return () => clearTimeout(slideTimeout.current); }, []);

  // ─── Sync refs + cargar cola según lista activa ───────────────────────────────
  const handleArtistTracksLoaded = (t) => {
    setArtistTracks(t);
    setTopArtist(prev => prev ? { ...prev, totalTracks: t.length } : prev);
  };
  const handleUserTracksLoaded = (t) => setUserTracks(t);
  const handleFavTracksLoaded  = (t) => setFavTracks(t);

  useEffect(() => {
    tracksRef.current = tracks;
    // Solo usar tracks generales si no hay ninguna otra lista activa
    if (favTracks.length === 0 && userTracks.length === 0 && artistTracks.length === 0) {
      playQueue.current.loadTracks(tracks);
    }
  }, [tracks]);

  useEffect(() => {
    artistTracksRef.current = artistTracks;
    if (artistTracks.length > 0) {
      playQueue.current.loadTracks(artistTracks);
      historyStack.current.clear();
    }
  }, [artistTracks]);

  useEffect(() => {
    userTracksRef.current = userTracks;
    if (userTracks.length > 0) {
      playQueue.current.loadTracks(userTracks);
      historyStack.current.clear();
    }
  }, [userTracks]);

  useEffect(() => {
    favTracksRef.current = favTracks;
    if (favTracks.length > 0) {
      playQueue.current.loadTracks(favTracks);
      historyStack.current.clear();
    }
  }, [favTracks]);

  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);

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
      } catch { navigate('/auth'); }
    };
    checkAuth();
  }, [navigate, location]);

  useEffect(() => {
    return () => {
      clearInterval(progressInterval.current);
      if (ytPlayerRef.current) { try { ytPlayerRef.current.destroy(); } catch (_) {} }
    };
  }, []);

  // ─── Carga de canciones destacadas → delegado a HashTablesTries ──────────────
  const loadFeaturedTracks = async () => {
    try {
      setTracksLoading(true);
      setError('');
      setTopArtist(null);
      historyStack.current.clear();
      const data = await fetchFeaturedTracks(spotifyService);
      setTracks(data);
    } catch {
      setError('No se pudieron cargar las canciones. Intenta de nuevo.');
    } finally {
      setTracksLoading(false);
    }
  };

  // ─── Búsqueda de canciones y artistas → delegado a HashTablesTries (cache + Trie) ─
  const runSearch = async (query) => {
    try {
      setTracksLoading(true);
      setError('');
      setSelectedArtist(null);
      const { tracks: trackResults, topArtist, searchArtistTracks } =
        await searchTracksAndArtists(query, spotifyService);
      setTracks(trackResults);
      setTopArtist(topArtist);
      setSearchArtistTracks(searchArtistTracks);
      if (resultsRef.current) resultsRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('Error al buscar canciones.');
    } finally {
      setTracksLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSuggestions(getSuggestions(value));
    clearTimeout(searchTimeout.current);

    if (value.trim() === '') {
      setTopArtist(null);
      setSelectedArtist(null);
      setArtistTracks([]);
      setSearchArtistTracks([]);
      loadFeaturedTracks();
      return;
    }

    searchTimeout.current = setTimeout(() => runSearch(value), 500);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setSuggestions([]);
    runSearch(suggestion);
  };

  // ─── YouTube ──────────────────────────────────────────────────────────────────
  const startProgressTracking = () => {
    clearInterval(progressInterval.current);
    progressInterval.current = setInterval(() => {
      if (ytPlayerRef.current && ytReadyRef.current) {
        try {
          const t = ytPlayerRef.current.getCurrentTime?.() || 0;
          const d = ytPlayerRef.current.getDuration?.()    || 0;
          setCurrentTime(t);
          if (d > 0) setDuration(d);
        } catch (_) {}
      }
    }, 500);
  };

  const loadYoutubePlayer = (videoId) => {
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
          height: '1', width: '1', videoId,
          playerVars: { autoplay: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, fs: 0, playsinline: 1, mute: 1 },
          events: {
            onReady: (event) => {
              event.target.mute();
              event.target.setVolume(vol);
              event.target.playVideo();
              setTimeout(() => {
                try { event.target.unMute(); event.target.setVolume(vol); } catch (_) {}
              }, 800);
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
                // ── Cuando la canción termina sola: avanzar con la Cola ──
                setIsPlaying(false);
                clearInterval(progressInterval.current);
                const ct = currentTrackRef.current;
                if (!ct || playQueue.current.isEmpty()) return;
                historyStack.current.push(ct);
                const next = playQueue.current.getNext(ct.id);
                if (next) {
                  triggerSlide('slide-in-right');
                  playTrackInternal(next);
                }
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

  // ─── Reproducción ─────────────────────────────────────────────────────────────
  const playTrackInternal = async (track) => {
    setCurrentTrack(track);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setYoutubeLoading(true);

    historyService.registerPlay(track);
    favoritesService.checkFavorite(track.id).then(res => setIsFavorite(res.isFavorite));

    const videoId = await spotifyService.getYoutubeVideoId(track.name, track.artist);

    if (!videoId) {
      setYoutubeLoading(false);
      setError(`No se encontró "${track.name}" en YouTube.`);
      setTimeout(() => setError(''), 4000);
      return;
    }

    setYoutubeLoading(false);
    await loadYoutubePlayer(videoId);
  };

  const playTrack = async (track) => {
    if (currentTrack?.id === track.id) { togglePlay(); return; }
    // Guardar la canción actual en el historial antes de cambiar
    if (currentTrack) historyStack.current.push(currentTrack);
    await playTrackInternal(track);
  };

  const togglePlay = () => {
    if (!ytPlayerRef.current || !currentTrack) return;
    try {
      if (isPlaying) ytPlayerRef.current.pauseVideo();
      else           ytPlayerRef.current.playVideo();
    } catch (_) {}
  };

  const handleToggleFavorite = async () => {
    if (!currentTrack || favoriteLoading) return;
    try {
      setFavoriteLoading(true);
      const res = await favoritesService.toggle(currentTrack);
      setIsFavorite(res.isFavorite);
    } catch { /* silencioso */ }
    finally { setFavoriteLoading(false); }
  };

  // ─── Siguiente / Anterior usando Cola + Pila ──────────────────────────────────
  const playNext = () => {
    if (!currentTrack || playQueue.current.isEmpty()) return;
    // Guardar la canción actual en la pila de historial
    historyStack.current.push(currentTrack);
    triggerSlide('slide-in-right');
    const next = playQueue.current.getNext(currentTrack.id);
    if (next) playTrack(next);
  };

  const playPrev = () => {
    if (!currentTrack) return;
    triggerSlide('slide-in-left');
    // Si hay historial real en la pila, retroceder a la canción anterior real
    if (!historyStack.current.isEmpty()) {
      const prev = historyStack.current.pop();
      if (prev) playTrackInternal(prev);
      return;
    }
    // Si no hay historial, retroceder en la cola de forma circular
    const prev = playQueue.current.getPrev(currentTrack.id);
    if (prev) playTrackInternal(prev);
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

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const handleLogout = async () => {
    clearInterval(progressInterval.current);
    if (ytPlayerRef.current) { try { ytPlayerRef.current.stopVideo(); } catch (_) {} }
    await authService.logout();
    navigate('/auth');
  };

  // ── Pantallas especiales ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="reproductor-loading">
        <div className="loading-spinner">
          <svg className="spinner-circle" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5"/>
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
          <div className="gradient-orb orb-1"/>
          <div className="gradient-orb orb-2"/>
          <div className="gradient-orb orb-3"/>
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
            <div className="loading-bar"><div className="loading-progress"/></div>
            <p>Preparando tu experiencia musical...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Vista activa ──────────────────────────────────────────────────────────────
  const renderContent = () => {
    if (showMisCanciones) return (
      <MisCanciones
        onClose={() => { setShowMisCanciones(false); setFavTracks([]); }}
        onPlayTrack={playTrack}
        onTracksLoaded={handleFavTracksLoaded}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        youtubeLoading={youtubeLoading}
      />
    );

    if (showUserProfile) return (
      <UserProfile
        user={user}
        onClose={() => { setShowUserProfile(false); setUserTracks([]); }}
        onPlayTrack={playTrack}
        onTracksLoaded={handleUserTracksLoaded}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        youtubeLoading={youtubeLoading}
        onOpenFavorites={() => { setShowUserProfile(false); setShowMisCanciones(true); }}
      />
    );

    if (selectedArtist) return (
      <ArtistProfile
        artistId={selectedArtist}
        onClose={() => { setSelectedArtist(null); setArtistTracks([]); }}
        onPlayTrack={playTrack}
        onTracksLoaded={handleArtistTracksLoaded}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        youtubeLoading={youtubeLoading}
        fallbackTracks={searchArtistTracks}
      />
    );

    return (
      <div className="content-container">
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
                  <p className="artist-result-followers">{topArtist.totalTracks ?? '—'} canciones disponibles</p>
                </div>
                <div className="artist-result-action">
                  <span>Ver artista</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            )}

            {topArtist && tracks.length > 0 && <p className="songs-section-label">Canciones</p>}

            <div className="tracks-grid">
              {tracks.map(track => (
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
    );
  };

  // ── Render principal ──────────────────────────────────────────────────────────
  return (
    <div className="reproductor-page">

      <div ref={ytContainerRef} style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }} />

      {/* ── Reproductor móvil pantalla completa ── */}
      {showMobilePlayer && currentTrack && (
        <Reproductor_Movil
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          isFavorite={isFavorite}
          favoriteLoading={favoriteLoading}
          currentTime={currentTime}
          duration={duration}
          youtubeLoading={youtubeLoading}
          onClose={() => setShowMobilePlayer(false)}
          onPlay={togglePlay}
          onNext={playNext}
          onPrev={playPrev}
          onSeek={handleSeek}
          onFavorite={handleToggleFavorite}
        />
      )}

      {/* ── Header ── */}
      <header className="reproductor-header">
        <div className="header-logo">
          <span className="logo-text">Shafa<span className="logo-accent">Fy</span></span>
        </div>
        <div className="search-bar-wrapper" style={{ position: 'relative', flex: 1, maxWidth: 500 }}>
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
          {suggestions.length > 0 && searchQuery.trim() !== '' && (
            <ul
              className="search-suggestions"
              
            >
              {suggestions.map((s, i) => (
                <li
                  key={`${s}-${i}`}
                  onClick={() => handleSuggestionClick(s)}
                  style={{
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    color: 'var(--color-text)',
                    fontSize: '0.95rem',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(29, 185, 84, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="header-user">
          <button
            className={`mis-canciones-btn ${showMisCanciones ? 'active' : ''}`}
            onClick={() => {
              setShowMisCanciones(v => !v);
              setShowUserProfile(false);
              setSelectedArtist(null);
              setFavTracks([]);
            }}
            title="Mis canciones favoritas"
          >
            <svg viewBox="0 0 24 24" fill={showMisCanciones ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>

          <div
            className={`user-avatar ${showUserProfile ? 'user-avatar--active' : ''}`}
            onClick={() => {
              setShowUserProfile(v => !v);
              setShowMisCanciones(false);
              setSelectedArtist(null);
              setUserTracks([]);
            }}
            title="Ver mi perfil"
            style={{ cursor: 'pointer' }}
          >
            {user?.fullName?.charAt(0).toUpperCase()}
          </div>
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

      {/* ── Contenido ── */}
      <main className="reproductor-content" ref={resultsRef}>
        {renderContent()}
      </main>

      {/* ── Player bar ── */}
      {currentTrack && (
        <div className="player-bar" ref={playerBarRef}>

          {/* Info canción — doble tap en portada abre reproductor móvil */}
          <div
            className={`player-track-info ${slideDirection}`}
            onAnimationEnd={() => setSlideDirection('')}
          >
            {currentTrack.albumImage && (
              <img
                src={currentTrack.albumImage}
                alt="cover"
                className="player-cover"
                onTouchEnd={handleCoverDoubleTap}
                style={{ cursor: 'pointer' }}
              />
            )}
            <div className="player-track-text">
              <p className="player-track-name">{currentTrack.name}</p>
              <p className="player-track-artist">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Controles */}
          <div className="player-controls">
            <button className="ctrl-btn skip-btn" onClick={playPrev} disabled={youtubeLoading}>
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

            <button className="ctrl-btn skip-btn" onClick={playNext} disabled={youtubeLoading}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>

            <button
              className={`heart-btn ${isFavorite ? 'heart-btn--active' : ''}`}
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
              title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              <svg viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>

            <div className="progress-section">
              <span className="time-label">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="1"
                value={currentTime}
                onChange={handleSeek}
                className="progress-bar"
              />
              <span className="time-label">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volumen — solo desktop */}
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