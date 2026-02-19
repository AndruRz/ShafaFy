import { useState, useEffect, useRef } from 'react';
import spotifyService from '../services/spotifyService';
import './ArtistProfile.css';

function ArtistProfile({ artistId, onClose, onPlayTrack, onTracksLoaded, currentTrack, isPlaying, youtubeLoading, fallbackTracks = [] }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('tracks');
  const containerRef = useRef(null);

  useEffect(() => {
    if (!artistId) return;
    loadProfile();
  }, [artistId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await spotifyService.getArtistProfile(artistId);

      // ✅ Si el backend no encontró canciones, usar las de la búsqueda general
      if ((!data.topTracks || data.topTracks.length === 0) && fallbackTracks.length > 0) {
        data.topTracks = fallbackTracks;
      }

      setProfileData(data);
      // Scroll al inicio del perfil
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // Notificar al padre para que use estas canciones en next/prev
      if (onTracksLoaded && data.topTracks) {
        onTracksLoaded(data.topTracks);
      }
    } catch (err) {
      setError('No se pudo cargar el perfil del artista.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="artist-profile">
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

  if (error) {
    return (
      <div className="artist-profile">
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

  const { artist, topTracks, albums } = profileData;

  return (
    <div className="artist-profile" ref={containerRef}>

      {/* ─── Botón volver ─────────────────────────────────────────────────── */}
      <button className="artist-back-btn" onClick={onClose}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Volver a resultados
      </button>

      {/* ─── Header del artista ───────────────────────────────────────────── */}
      <div className="artist-hero" style={{ '--artist-img': artist.image ? `url(${artist.image})` : 'none' }}>
        <div className="artist-hero-blur" />
        <div className="artist-hero-content">
          <div className="artist-avatar-wrap">
            {artist.image ? (
              <img src={artist.image} alt={artist.name} className="artist-avatar" />
            ) : (
              <div className="artist-avatar-placeholder">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </div>
            )}
          </div>

          <div className="artist-meta">
            <span className="artist-verified">✓ Artista</span>
            <h1 className="artist-name">{artist.name}</h1>
            <div className="artist-stats">
              <span className="artist-stat">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
                {topTracks.length} canciones disponibles
              </span>
              <span className="artist-stat">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                {topTracks.length} canciones disponibles
              </span>
            </div>
            {artist.genres.length > 0 && (
              <div className="artist-genres">
                {artist.genres.slice(0, 4).map((g) => (
                  <span key={g} className="genre-tag">{g}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="artist-tabs">
        <button
          className={`artist-tab ${activeTab === 'tracks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracks')}
        >
          🎵 Canciones populares
        </button>
        <button
          className={`artist-tab ${activeTab === 'albums' ? 'active' : ''}`}
          onClick={() => setActiveTab('albums')}
        >
          💿 Discografía
        </button>
      </div>

      {/* ─── Top Tracks ───────────────────────────────────────────────────── */}
      {activeTab === 'tracks' && (
        <div className="artist-tracks">
          {topTracks.length === 0 ? (
            <p className="artist-empty">No hay canciones disponibles</p>
          ) : (
            topTracks.map((track, index) => (
              <div
                key={track.id}
                className={`track-card ${currentTrack?.id === track.id ? 'active' : ''}`}
                onClick={() => onPlayTrack(track)}
              >
                <span className="track-number">{index + 1}</span>

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
                </div>

                <div className="track-duration">
                  {spotifyService.formatDuration(track.duration)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Álbumes ──────────────────────────────────────────────────────── */}
      {activeTab === 'albums' && (
        <div className="artist-albums-grid">
          {albums.length === 0 ? (
            <p className="artist-empty">No hay álbumes disponibles</p>
          ) : (
            albums.map((album) => (
              <div key={album.id} className="album-card">
                {album.image ? (
                  <img src={album.image} alt={album.name} className="album-cover" />
                ) : (
                  <div className="album-cover-placeholder">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
                    </svg>
                  </div>
                )}
                <div className="album-info">
                  <p className="album-name">{album.name}</p>
                  <p className="album-meta">
                    {album.releaseDate?.substring(0, 4)} · {album.type === 'single' ? 'Single' : 'Álbum'} · {album.totalTracks} {album.totalTracks === 1 ? 'canción' : 'canciones'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}

export default ArtistProfile;