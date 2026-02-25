// src/components/UserProfile.jsx
import { useState, useEffect } from 'react';
import historyService from '../services/historyService';
import './UserProfile.css';

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

function UserProfile({ user, onClose, onPlayTrack, onTracksLoaded, currentTrack, isPlaying, youtubeLoading }) {
  const [activeTab, setActiveTab]   = useState('tracks');
  const [topTracks, setTopTracks]   = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [month, setMonth]           = useState(null);
  const [year, setYear]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  useEffect(() => { loadData(); }, []);

  // Notificar al padre la lista para que next/prev funcione dentro del top
  useEffect(() => {
    if (onTracksLoaded && topTracks.length > 0) {
      onTracksLoaded(
        topTracks.map(t => ({
          id:         t.trackId,
          name:       t.trackName,
          artist:     t.artistName,
          album:      t.albumName,
          albumImage: t.albumImage,
          genre:      t.genre,
        }))
      );
    }
  }, [topTracks]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [tracksRes, artistsRes] = await Promise.all([
        historyService.getTopTracks(),
        historyService.getTopArtists(),
      ]);
      setTopTracks(tracksRes.topTracks    || []);
      setTopArtists(artistsRes.topArtists || []);
      setMonth(tracksRes.month);
      setYear(tracksRes.year);
    } catch {
      setError('No se pudo cargar tu actividad.');
    } finally {
      setLoading(false);
    }
  };

  const monthLabel = month ? `${MONTH_NAMES[month - 1]} ${year}` : '';
  const initials   = user?.fullName?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  const handlePlayTrack = (track) => {
    onPlayTrack({
      id:         track.trackId,
      name:       track.trackName,
      artist:     track.artistName,
      album:      track.albumName,
      albumImage: track.albumImage,
      genre:      track.genre,
    });
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="user-profile">
        <div className="artist-profile-loading">
          <div className="artist-skeleton-header" />
          <div className="artist-skeleton-info" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="track-skeleton" style={{ marginBottom: '0.5rem' }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="user-profile">
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
    <div className="user-profile">

      {/* ─── Botón volver ─────────────────────────────────────────────────────── */}
      <button className="artist-back-btn" onClick={onClose}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Volver
      </button>

      {/* ─── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="user-hero">
        <div className="user-hero-blur" />
        <div className="artist-hero-content">

          {/* Avatar grande con iniciales */}
          <div className="artist-avatar-wrap">
            <div className="user-avatar-large">{initials}</div>
          </div>

          {/* Meta */}
          <div className="artist-meta">
            <span className="artist-verified">✓ Tu perfil</span>
            <h1 className="artist-name">{user?.fullName}</h1>

            <div className="artist-stats">
              <span className="artist-stat">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
                @{user?.username}
              </span>
              <span className="artist-stat">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                {user?.email}
              </span>
              {topTracks.length > 0 && (
                <span className="artist-stat">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                  {topTracks.length} canciones escuchadas este mes
                </span>
              )}
            </div>

            {monthLabel && (
              <div className="artist-genres">
                <span className="genre-tag">📅 {monthLabel}</span>
                {topArtists.length > 0 && (
                  <span className="genre-tag">🎤 {topArtists.length} artistas</span>
                )}
                {topTracks.reduce((acc, t) => acc + t.playCount, 0) > 0 && (
                  <span className="genre-tag">
                    ▶ {topTracks.reduce((acc, t) => acc + t.playCount, 0)} reproducciones
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="artist-tabs">
        <button
          className={`artist-tab ${activeTab === 'tracks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracks')}
        >
          🎵 Top canciones
        </button>
        <button
          className={`artist-tab ${activeTab === 'artists' ? 'active' : ''}`}
          onClick={() => setActiveTab('artists')}
        >
          🎤 Top artistas
        </button>
      </div>

      {/* ─── Top canciones ────────────────────────────────────────────────────── */}
      {activeTab === 'tracks' && (
        <div className="artist-tracks">
          {topTracks.length === 0 ? (
            <p className="artist-empty">
              Aún no has escuchado canciones este mes.<br/>
              <span style={{ fontSize: '0.85rem' }}>¡Reproduce algo para verlo aquí!</span>
            </p>
          ) : (
            topTracks.map((track, index) => {
              const isActive = currentTrack?.id === track.trackId;
              const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1;
              return (
                <div
                  key={track.trackId}
                  className={`track-card ${isActive ? 'active' : ''}`}
                  onClick={() => handlePlayTrack(track)}
                >
                  {/* Posición */}
                  <span className="track-number" style={{ fontSize: index < 3 ? '1.1rem' : '0.85rem' }}>
                    {medal}
                  </span>

                  {/* Portada */}
                  <div className="track-image-wrapper">
                    {track.albumImage ? (
                      <img src={track.albumImage} alt={track.albumName} className="track-image" />
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

                  {/* Info */}
                  <div className="track-info">
                    <p className="track-name">{track.trackName}</p>
                    <p className="track-artist">{track.artistName}</p>
                    <p className="track-album">{track.albumName}</p>
                  </div>

                  {/* Plays badge */}
                  <div className="up-plays-badge">
                    <span className="up-plays-num">{track.playCount}</span>
                    <span className="up-plays-lbl">plays</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── Top artistas ─────────────────────────────────────────────────────── */}
      {activeTab === 'artists' && (
        <div className="artist-tracks">
          {topArtists.length === 0 ? (
            <p className="artist-empty">
              Aún no tienes artistas favoritos este mes.<br/>
              <span style={{ fontSize: '0.85rem' }}>¡Escucha más música!</span>
            </p>
          ) : (
            topArtists.map((artist, index) => {
              const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1;
              return (
                <div key={artist.artistId} className="track-card" style={{ cursor: 'default' }}>
                  {/* Posición */}
                  <span className="track-number" style={{ fontSize: index < 3 ? '1.1rem' : '0.85rem' }}>
                    {medal}
                  </span>

                  {/* Avatar artista */}
                  <div className="up-artist-avatar-circle">
                    {artist.artistName?.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="track-info">
                    <p className="track-name">{artist.artistName}</p>
                    <p className="track-artist">
                      {artist.trackCount} {artist.trackCount === 1 ? 'canción escuchada' : 'canciones escuchadas'}
                    </p>
                  </div>

                  {/* Total plays */}
                  <div className="up-plays-badge">
                    <span className="up-plays-num">{artist.totalPlays}</span>
                    <span className="up-plays-lbl">plays</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

    </div>
  );
}

export default UserProfile;