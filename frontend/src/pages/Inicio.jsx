// src/pages/Inicio.jsx
import { useState, useEffect, useRef } from 'react';
import graphService    from '../services/graphService';
import spotifyService  from '../services/spotifyService';
import GraphModal      from './GraphModal';
import './css/Inicio.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PlayingIndicator = () => (
  <div className="playing-indicator"><span/><span/><span/></div>
);

const Spinner = () => (
  <svg viewBox="0 0 50 50" width="24" height="24">
    <circle cx="25" cy="25" r="18" fill="none" stroke="white" strokeWidth="4"
      strokeDasharray="80" strokeLinecap="round">
      <animateTransform attributeName="transform" type="rotate"
        from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite"/>
    </circle>
  </svg>
);

// ─── Tarjeta de canción cuadrada ──────────────────────────────────────────────
function TrackCardSquare({ track, isActive, isPlaying, youtubeLoading, onClick, reason }) {
  return (
    <div
      className={`track-card-square ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="tcs-img-wrap">
        {track.albumImage ? (
          <img src={track.albumImage} alt={track.albumName || track.album} />
        ) : (
          <div className="tcs-img-placeholder">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
        )}

        {reason && <div className="tcs-reason-badge">{reason}</div>}

        <div className="tcs-overlay">
          <div className="tcs-play-icon">
            {isActive && youtubeLoading ? <Spinner /> :
             isActive && isPlaying ? <PlayingIndicator /> : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </div>
        </div>
      </div>

      <div className="tcs-info">
        <p className="tcs-name">{track.trackName || track.name}</p>
        <p className="tcs-artist">{track.artistName || track.artist}</p>
      </div>
    </div>
  );
}

// ─── Tarjeta de artista cuadrada ──────────────────────────────────────────────
function ArtistCardSquare({ artist, onClick }) {
  return (
    <div className="artist-card-square" onClick={onClick}>
      <div className="acs-avatar">
        {artist.image ? (
          <img src={artist.image} alt={artist.artistName || artist.name} />
        ) : (
          <div className="acs-avatar-placeholder">
            {(artist.artistName || artist.name || '?').charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <p className="acs-name">{artist.artistName || artist.name}</p>
      {artist.genres?.length > 0 && (
        <div className="acs-genres">
          {artist.genres.slice(0, 2).map(g => (
            <span key={g} className="acs-genre-tag">{g}</span>
          ))}
        </div>
      )}
      {artist.score !== undefined && (
        <p className="acs-meta">
          {artist.userCount > 0 ? `${artist.userCount} usuarios en común` : 'Relacionado'}
        </p>
      )}
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────
function SkeletonRow({ count = 5, isArtist = false }) {
  return (
    <div className="inicio-skeleton-row">
      {[...Array(count)].map((_, i) => (
        <div key={i} className={`inicio-skeleton-card ${isArtist ? 'inicio-skeleton-artist' : ''}`} />
      ))}
    </div>
  );
}

// ─── Carrusel con flechas de navegación ──────────────────────────────────────
function Carousel({ children, isEmpty }) {
  const scrollRef  = useRef(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const t = setTimeout(checkScroll, 120);
    return () => clearTimeout(t);
  }, [children]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 340, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };

  if (isEmpty) return <>{children}</>;

  return (
    <div className="inicio-carousel-wrap">
      <div className="inicio-carousel">
        {children}
      </div>
    </div>
  );
}

// ─── Helper: enriquecer artistas con imagen + ID real de Spotify ──────────────
// El grafo solo guarda artistName/artistId internos. Este helper busca en
// Spotify para obtener la imagen de perfil y el ID oficial, que es el que
// necesita ArtistProfile para cargar las canciones correctamente.
const enrichArtistsWithSpotify = async (artists) => {
  const enriched = await Promise.all(
    artists.map(async (artist) => {
      if (artist.image && artist.artistId?.length === 22) return artist;

      try {
        const searchName = artist.artistName || artist.name || '';
        const results = await spotifyService.searchArtists(searchName);
        if (!results?.length) return artist;

        const normalize = (s) => s?.toLowerCase().trim() ?? '';
        const match =
          results.find(r => normalize(r.name) === normalize(searchName)) ||
          results.find(r => normalize(r.name).includes(normalize(searchName))) ||
          results[0];

        if (!match) return artist;

        return {
          ...artist,
          artistId: match.id || artist.artistId,
          image:    match.image || artist.image || null,
          genres:   artist.genres?.length > 0 ? artist.genres : (match.genres || []),
        };
      } catch {
        return artist;
      }
    })
  );
  return enriched;
};

// ─── Componente principal ─────────────────────────────────────────────────────
function Inicio({ user, currentTrack, isPlaying, youtubeLoading, onPlayTrack, onOpenArtist }) {
  const [recentTracks,      setRecentTracks]      = useState([]);
  const [relatedArtists,    setRelatedArtists]     = useState([]);
  const [recommendedTracks, setRecommendedTracks]  = useState([]);
  const [mayLikeArtists,    setMayLikeArtists]     = useState([]);
  const [showGraphModal,    setShowGraphModal]      = useState(false);

  const [loadingRecent,  setLoadingRecent]  = useState(true);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [loadingRecom,   setLoadingRecom]   = useState(true);
  const [loadingMayLike, setLoadingMayLike] = useState(true);

  // Guardar la lista de canciones recientes para que next/prev funcione
  // dentro del carrusel "Sigue escuchando"
  const recentTracksRef = useRef([]);

  useEffect(() => {
    loadAll();
  }, []);

  // Cuando cambia la canción actual, cargar recomendaciones por colaboraciones
  useEffect(() => {
    if (currentTrack?.artistId && currentTrack?.artist) {
      loadRecommendedTracks(currentTrack.artistId, currentTrack.artist);
    }
  }, [currentTrack?.artistId]);

  const loadAll = async () => {
    loadRecentTracks();
    loadRelatedArtists();
    loadRecommendedTracks(); // sin argumentos
    loadMayLike();
  };

  const loadRecentTracks = async () => {
    setLoadingRecent(true);
    const data = await graphService.getRecentTracks();
    setRecentTracks(data);
    recentTracksRef.current = data.map(normalizeTrack);
    setLoadingRecent(false);
  };

  // ─── FIX: enriquecer con Spotify para obtener imagen + ID real ───────────────
    const loadRelatedArtists = async () => {
      setLoadingArtists(true);
      const data = await graphService.getRelatedArtists();
      const enriched = await enrichArtistsWithSpotify(data);

      // ✅ Deduplicar por artistId real (por si el enriquecimiento colisiona)
      const unique = Array.from(
        new Map(enriched.map(a => [a.artistId, a])).values()
      );

      setRelatedArtists(unique);
      setLoadingArtists(false);
    };

  const loadRecommendedTracks = async () => {
    setLoadingRecom(true);
    const data = await graphService.getRecommendedTracks();
    setRecommendedTracks(data);
    setLoadingRecom(false);
  };

  // ─── FIX: enriquecer con Spotify para obtener imagen + ID real ───────────────
  const loadMayLike = async () => {
    setLoadingMayLike(true);
    const data = await graphService.getMayLike();
    const enriched = await enrichArtistsWithSpotify(data);
    setMayLikeArtists(enriched);
    setLoadingMayLike(false);
  };

  const userName = user?.fullName?.split(' ')[0] || user?.username || 'tú';

  // Normalizar track al formato estándar que usa el reproductor
  const normalizeTrack = (t) => ({
    id:         t.trackId  || t.id,
    name:       t.trackName  || t.name,
    artist:     t.artistName || t.artist,
    artistId:   t.artistId,
    album:      t.albumName  || t.album,
    albumImage: t.albumImage,
    genre:      t.genre,
  });

  // Al reproducir desde "Sigue escuchando" pasamos la lista completa normalizada
  // para que next/prev funcione en orden dentro del carrusel.
  const handlePlayRecent = (track) => {
    onPlayTrack(normalizeTrack(track), 'recent', recentTracksRef.current);
  };

  // Al abrir un artista desde el grafo, usamos el artistId ya enriquecido
  // (ID real de Spotify). Pasamos un fallback vacío; ArtistProfile buscará
  // las canciones él mismo si el backend no las trae.
  const handleOpenArtist = (artist) => {
    const fallback = (artist.tracks || []).map(t => ({
      id:         t.trackId   || t.id,
      name:       t.trackName || t.name,
      artist:     t.artistName || t.artist || artist.artistName || artist.name,
      artistId:   t.artistId  || artist.artistId,
      album:      t.albumName || t.album || '',
      albumImage: t.albumImage || '',
      duration:   t.duration  || 0,
      genre:      t.genre     || '',
    }));
    onOpenArtist(artist.artistId, fallback);
  };

  return (
    <div className="inicio-page">

      {/* ══════════════════════════════════════════════════════════════════════
          1. SIGUE ESCUCHANDO
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="inicio-section">
        <div className="inicio-section-header">
          <div className="inicio-section-title-block">
            <span className="inicio-section-eyebrow">Hecho para {userName}</span>
            <h2 className="inicio-section-title">Sigue escuchando</h2>
            <p className="inicio-section-sub">Aquellas canciones que tanto te gustaron</p>
          </div>
        </div>

        {loadingRecent ? (
          <SkeletonRow count={5} />
        ) : recentTracks.length === 0 ? (
          <div className="inicio-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            Reproduce canciones para que aparezcan aquí.
          </div>
        ) : (
          <Carousel>
            {recentTracks.map(track => (
              <TrackCardSquare
                key={track.trackId || track.id}
                track={track}
                isActive={currentTrack?.id === (track.trackId || track.id)}
                isPlaying={isPlaying}
                youtubeLoading={youtubeLoading}
                onClick={() => handlePlayRecent(track)}
              />
            ))}
          </Carousel>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          2. ARTISTAS RELACIONADOS (GRAFO)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="inicio-section">
        <div className="inicio-section-header">
          <div className="inicio-section-title-block">
            <span className="inicio-section-eyebrow">Grafo de artistas</span>
            <h2 className="inicio-section-title">Artistas relacionados</h2>
            <p className="inicio-section-sub">Basado en lo que escuchas</p>
          </div>
          <div className="inicio-section-actions">
            <button className="inicio-graph-btn" onClick={() => setShowGraphModal(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="5"  cy="5"  r="2"/><circle cx="19" cy="5"  r="2"/>
                <circle cx="12" cy="19" r="2"/><circle cx="5"  cy="12" r="2"/>
                <line x1="7" y1="5" x2="17" y2="5"/>
                <line x1="5" y1="7" x2="5" y2="10"/>
                <line x1="7" y1="12" x2="10" y2="17"/>
                <line x1="19" y1="7" x2="14" y2="17"/>
              </svg>
              Ver grafo
            </button>
          </div>
        </div>

        {loadingArtists ? (
          <SkeletonRow count={5} isArtist />
        ) : relatedArtists.length === 0 ? (
          <div className="inicio-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
            Escucha más artistas para ver conexiones aquí.
          </div>
        ) : (
          <Carousel>
            {relatedArtists.map(artist => (
            <ArtistCardSquare
              key={`${artist.artistId}-${artist.artistName}`}
                artist={artist}
                onClick={() => handleOpenArtist(artist)}
              />
            ))}
          </Carousel>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          3. CANCIONES RECOMENDADAS POR COLABORACIONES
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="inicio-section">
        <div className="inicio-section-header">
          <div className="inicio-section-title-block">
            <span className="inicio-section-eyebrow">Basado en tu historial</span>
            <h2 className="inicio-section-title">Canciones recomendadas</h2>
            <p className="inicio-section-sub">Artistas relacionados a lo que escuchas este mes</p>
          </div>
        </div>

        {loadingRecom ? (
          <SkeletonRow count={5} />
        ) : recommendedTracks.length === 0 ? (
          <div className="inicio-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
              <path d="M9 19V6l12-3v13M9 19c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-3c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"/>
            </svg>
            Escucha más música este mes para obtener recomendaciones.
          </div>
        ) : (
          <Carousel>
            {recommendedTracks.map(track => (
              <TrackCardSquare
                key={track.id}
                track={track}
                isActive={currentTrack?.id === track.id}
                isPlaying={isPlaying}
                youtubeLoading={youtubeLoading}
                reason={track.reason}
                onClick={() => onPlayTrack(normalizeTrack(track), 'recommended')}
              />
            ))}
          </Carousel>
        )}
      </div>

      {/* ── Modal del grafo ── */}
      {showGraphModal && (
        <GraphModal onClose={() => setShowGraphModal(false)} />
      )}

    </div>
  );
}

export default Inicio;