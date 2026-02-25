// src/components/UserProfile.jsx
import { useState, useEffect } from 'react';
import historyService from '../services/historyService';
import './UserProfile.css';

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

function UserProfile({ user, onClose, onPlayTrack, currentTrack, isPlaying }) {
  const [activeTab, setActiveTab]     = useState('tracks'); // 'tracks' | 'artists'
  const [topTracks, setTopTracks]     = useState([]);
  const [topArtists, setTopArtists]   = useState([]);
  const [month, setMonth]             = useState(null);
  const [year, setYear]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [tracksRes, artistsRes] = await Promise.all([
        historyService.getTopTracks(),
        historyService.getTopArtists(),
      ]);
      setTopTracks(tracksRes.topTracks   || []);
      setTopArtists(artistsRes.topArtists || []);
      setMonth(tracksRes.month);
      setYear(tracksRes.year);
    } catch (err) {
      setError('No se pudo cargar tu actividad.');
    } finally {
      setLoading(false);
    }
  };

  const monthLabel = month ? `${MONTH_NAMES[month - 1]} ${year}` : '';
  const initials   = user?.fullName?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <>
      {/* Overlay oscuro detrás del panel */}
      <div className="up-overlay" onClick={onClose} />

      <aside className="up-panel">

        {/* ── Botón cerrar ── */}
        <button className="up-close" onClick={onClose} aria-label="Cerrar perfil">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* ── Cabecera del usuario ── */}
        <div className="up-header">
          <div className="up-avatar-ring">
            <div className="up-avatar">{initials}</div>
          </div>
          <div className="up-user-info">
            <h2 className="up-fullname">{user?.fullName}</h2>
            <span className="up-username">@{user?.username}</span>
            <span className="up-email">{user?.email}</span>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="up-divider" />

        {/* ── Mes activo ── */}
        {monthLabel && (
          <div className="up-month-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            Actividad de {monthLabel}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="up-tabs">
          <button
            className={`up-tab ${activeTab === 'tracks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tracks')}
          >
            🎵 Top canciones
          </button>
          <button
            className={`up-tab ${activeTab === 'artists' ? 'active' : ''}`}
            onClick={() => setActiveTab('artists')}
          >
            🎤 Top artistas
          </button>
        </div>

        {/* ── Contenido ── */}
        <div className="up-content">

          {loading && (
            <div className="up-loading">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="up-skeleton" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="up-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
              </svg>
              <p>{error}</p>
              <button className="up-retry-btn" onClick={loadData}>Reintentar</button>
            </div>
          )}

          {/* ── Top canciones ── */}
          {!loading && !error && activeTab === 'tracks' && (
            <>
              {topTracks.length === 0 ? (
                <div className="up-empty">
                  <span className="up-empty-icon">🎵</span>
                  <p>Aún no has escuchado canciones este mes.</p>
                  <span>¡Empieza a reproducir música!</span>
                </div>
              ) : (
                <ul className="up-list">
                  {topTracks.map((track, i) => (
                    <li
                      key={track.trackId}
                      className={`up-list-item ${currentTrack?.id === track.trackId ? 'active' : ''}`}
                      onClick={() => onPlayTrack && onPlayTrack({
                        id:         track.trackId,
                        name:       track.trackName,
                        artist:     track.artistName,
                        album:      track.albumName,
                        albumImage: track.albumImage,
                        genre:      track.genre,
                      })}
                    >
                      {/* Posición */}
                      <span className={`up-rank ${i < 3 ? `up-rank-${i + 1}` : ''}`}>
                        {i + 1}
                      </span>

                      {/* Imagen */}
                      <div className="up-track-img-wrap">
                        {track.albumImage ? (
                          <img src={track.albumImage} alt={track.trackName} className="up-track-img" />
                        ) : (
                          <div className="up-track-img-placeholder">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                            </svg>
                          </div>
                        )}

                        {/* Indicador si está sonando */}
                        {currentTrack?.id === track.trackId && isPlaying && (
                          <div className="up-playing-badge">
                            <div className="up-bars"><span/><span/><span/></div>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="up-track-info">
                        <p className="up-track-name">{track.trackName}</p>
                        <p className="up-track-artist">{track.artistName}</p>
                      </div>

                      {/* Reproducciones */}
                      <div className="up-plays">
                        <span className="up-plays-count">{track.playCount}</span>
                        <span className="up-plays-label">plays</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* ── Top artistas ── */}
          {!loading && !error && activeTab === 'artists' && (
            <>
              {topArtists.length === 0 ? (
                <div className="up-empty">
                  <span className="up-empty-icon">🎤</span>
                  <p>Aún no tienes artistas favoritos este mes.</p>
                  <span>¡Escucha más música!</span>
                </div>
              ) : (
                <ul className="up-list">
                  {topArtists.map((artist, i) => (
                    <li key={artist.artistId} className="up-list-item up-artist-item">
                      {/* Posición */}
                      <span className={`up-rank ${i < 3 ? `up-rank-${i + 1}` : ''}`}>
                        {i + 1}
                      </span>

                      {/* Avatar artista (inicial) */}
                      <div className="up-artist-avatar">
                        {artist.artistName?.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="up-track-info">
                        <p className="up-track-name">{artist.artistName}</p>
                        <p className="up-track-artist">
                          {artist.trackCount} {artist.trackCount === 1 ? 'canción' : 'canciones'} escuchadas
                        </p>
                      </div>

                      {/* Total plays */}
                      <div className="up-plays">
                        <span className="up-plays-count">{artist.totalPlays}</span>
                        <span className="up-plays-label">plays</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

        </div>

      </aside>
    </>
  );
}

export default UserProfile;