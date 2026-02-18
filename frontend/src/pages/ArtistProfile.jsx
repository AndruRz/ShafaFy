import { useState, useEffect } from 'react';
import spotifyService from '../services/spotifyService';
import './ArtistProfile.css';

function ArtistProfile({ artistId, onClose, onPlayTrack, currentTrack, isPlaying }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('tracks'); // 'tracks' | 'albums'

  useEffect(() => {
    if (!artistId) return;
    loadProfile();
  }, [artistId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await spotifyService.getArtistProfile(artistId);
      setProfileData(data);
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
    <div className="artist-profile">

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
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
                {spotifyService.formatFollowers(artist.followers)} seguidores
              </span>
              <span className="artist-stat">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                Popularidad {artist.popularity}%
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
                    {currentTrack?.id === track.id && isPlaying ? (
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