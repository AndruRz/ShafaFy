// src/components/MisCanciones.jsx
import { useState, useEffect } from 'react';
import favoritesService from '../services/favoritesService';
import './MisCanciones.css';

const getTimeLabel = (savedAt) => {
  const now      = new Date();
  const saved    = new Date(savedAt);
  const diffMs   = now - saved;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs  = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const monthsDiff =
    (now.getFullYear() - saved.getFullYear()) * 12 +
    (now.getMonth() - saved.getMonth());

  if (diffMins < 1)      return 'Ahora mismo';
  if (diffMins < 60)     return `Hace ${diffMins} min`;
  if (diffHrs  < 24)     return `Hace ${diffHrs}h`;
  if (diffDays === 1)    return 'Ayer';
  if (diffDays < 30)     return `Hace ${diffDays} días`;
  return saved.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

function MisCanciones({ onClose, onPlayTrack, onTracksLoaded, currentTrack, isPlaying, youtubeLoading }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => { loadFavorites(); }, []);

  useEffect(() => {
    if (onTracksLoaded && favorites.length > 0) {
      onTracksLoaded(
        favorites.map(f => ({
          id:         f.trackId,
          name:       f.trackName,
          artist:     f.artistName,
          album:      f.albumName,
          albumImage: f.albumImage,
          genre:      f.genre,
        }))
      );
    }
  }, [favorites]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await favoritesService.getFavorites();
      setFavorites(data.favorites || []);
    } catch {
      setError('No se pudieron cargar tus canciones favoritas.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (e, trackId) => {
    e.stopPropagation();
    try {
      await favoritesService.toggle({ id: trackId, name: '', artist: '', artistId: '' });
      setFavorites(prev => prev.filter(f => f.trackId !== trackId));
    } catch { /* silencioso */ }
  };

  const handlePlay = (fav) => {
    onPlayTrack({
      id:         fav.trackId,
      name:       fav.trackName,
      artist:     fav.artistName,
      album:      fav.albumName,
      albumImage: fav.albumImage,
      genre:      fav.genre,
    });
  };

  if (loading) {
    return (
      <div className="mis-canciones">
        <div className="artist-profile-loading">
          <div className="artist-skeleton-header" />
          <div className="artist-skeleton-info" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="track-skeleton" style={{ marginBottom: '0.5rem' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mis-canciones">
        <div className="artist-error">
          <button className="artist-back-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Volver
          </button>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mis-canciones">

      <button className="artist-back-btn" onClick={onClose}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Volver
      </button>

      {/* ── Hero ── */}
      <div className="mc-hero">
        <div className="mc-hero-blur" />
        <div className="artist-hero-content">
          <div className="artist-avatar-wrap">
            <div className="mc-avatar">
              <svg viewBox="0 0 24 24" fill="currentColor" width="60" height="60">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
          </div>
          <div className="artist-meta">
            <span className="artist-verified">❤️ Colección personal</span>
            <h1 className="artist-name">Mis Canciones</h1>
            <div className="artist-stats">
              <span className="artist-stat">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
                {favorites.length} {favorites.length === 1 ? 'canción guardada' : 'canciones guardadas'}
              </span>
              {favorites.length > 0 && (
                <span className="artist-stat">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"/>
                  </svg>
                  Última: {getTimeLabel(favorites[0]?.savedAt)}
                </span>
              )}
            </div>
            {favorites.length > 0 && (
              <div className="artist-genres">
                {[...new Set(favorites.map(f => f.genre).filter(g => g && g !== 'unknown'))]
                  .slice(0, 4)
                  .map(g => <span key={g} className="genre-tag">{g}</span>)
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Lista ── */}
      {favorites.length === 0 ? (
        <div className="mc-empty">
          <div className="mc-empty-heart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <h3>Aún no tienes canciones favoritas</h3>
          <p>Presiona el ❤️ en el reproductor mientras escuchas una canción para guardarla aquí.</p>
        </div>
      ) : (
        <div className="artist-tracks">
          {favorites.map((fav, index) => {
            const isActive = currentTrack?.id === fav.trackId;
            return (
              <div
                key={fav.trackId}
                className={`track-card ${isActive ? 'active' : ''}`}
                onClick={() => handlePlay(fav)}
              >
                <span className="track-number">{index + 1}</span>

                <div className="track-image-wrapper">
                  {fav.albumImage ? (
                    <img src={fav.albumImage} alt={fav.albumName} className="track-image" />
                  ) : (
                    <div className="track-image-placeholder">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                      </svg>
                    </div>
                  )}
                  <div className="track-overlay">
                    {isActive && youtubeLoading ? (
                      <svg viewBox="0 0 50 50" width="28" height="28">
                        <circle cx="25" cy="25" r="18" fill="none" stroke="white" strokeWidth="4" strokeDasharray="80" strokeLinecap="round">
                          <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite"/>
                        </circle>
                      </svg>
                    ) : isActive && isPlaying ? (
                      <div className="playing-indicator"><span/><span/><span/></div>
                    ) : (
                      <svg className="play-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    )}
                  </div>
                </div>

                <div className="track-info">
                  <p className="track-name">{fav.trackName}</p>
                  <p className="track-artist">{fav.artistName}</p>
                  <p className="track-album">{fav.albumName}</p>
                </div>

                <div className="mc-saved-at">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  {getTimeLabel(fav.savedAt)}
                </div>

                <button
                  className="mc-remove-btn"
                  onClick={(e) => handleRemove(e, fav.trackId)}
                  title="Quitar de favoritos"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MisCanciones;