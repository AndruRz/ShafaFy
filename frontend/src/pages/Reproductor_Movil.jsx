import { useEffect, useRef, useState } from 'react';
import './css/Reproductor_Movil.css';

function Reproductor_Movil({
  currentTrack,
  isPlaying,
  isFavorite,
  favoriteLoading,
  currentTime,
  duration,
  youtubeLoading,
  onClose,
  onPlay,
  onNext,
  onPrev,
  onSeek,
  onFavorite,
}) {
  const [bgColor, setBgColor]     = useState('#0A0E27');
  const [bgColor2, setBgColor2]   = useState('#151B3D');
  const [closing, setClosing]     = useState(false);
  const canvasRef                 = useRef(null);

  // ─── Swipe down para cerrar ───────────────────────────────────────────────
  const touchStartY   = useRef(null);
  const containerRef  = useRef(null);

  // ─── Extraer color dinámico de la portada ────────────────────────────────
  useEffect(() => {
    if (!currentTrack?.albumImage) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = currentTrack.albumImage;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      canvas.width  = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);

      // Sacar color dominante desde varias zonas
      const getPixel = (x, y) => ctx.getImageData(x, y, 1, 1).data;

      const samples = [
        getPixel(5,  5),
        getPixel(25, 5),
        getPixel(45, 5),
        getPixel(5,  25),
        getPixel(25, 25),
        getPixel(5,  45),
        getPixel(25, 45),
      ];

      let r = 0, g = 0, b = 0;
      samples.forEach(p => { r += p[0]; g += p[1]; b += p[2]; });
      r = Math.floor(r / samples.length);
      g = Math.floor(g / samples.length);
      b = Math.floor(b / samples.length);

      // Oscurecer para que no sea demasiado brillante
      const darken = (v) => Math.floor(v * 0.45);
      const darken2 = (v) => Math.floor(v * 0.25);

      setBgColor(`rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`);
      setBgColor2(`rgb(${darken2(r)}, ${darken2(g)}, ${darken2(b)})`);
    };

    img.onerror = () => {
      setBgColor('#0A0E27');
      setBgColor2('#151B3D');
    };
  }, [currentTrack?.albumImage]);

  // ─── Cerrar con animación ─────────────────────────────────────────────────
  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose(), 320);
  };

  // ─── Swipe down ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
    const onTouchEnd   = (e) => {
      if (touchStartY.current === null) return;
      const delta = e.changedTouches[0].clientY - touchStartY.current;
      if (delta > 80) handleClose();
      touchStartY.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, []);

  // ─── Formato tiempo ───────────────────────────────────────────────────────
  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`rm-overlay ${closing ? 'rm-closing' : ''}`}
      style={{ background: `linear-gradient(180deg, ${bgColor} 0%, ${bgColor2} 60%, #0A0E27 100%)` }}
    >
      {/* Canvas oculto para extraer color */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ── Barra superior ── */}
      <div className="rm-topbar">
        <button className="rm-close-btn" onClick={handleClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div className="rm-topbar-center">
          <span className="rm-topbar-label">Reproduciendo ahora</span>
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* ── Portada ── */}
      <div className="rm-cover-wrap">
        {currentTrack?.albumImage ? (
          <img
            src={currentTrack.albumImage}
            alt={currentTrack?.album}
            className={`rm-cover ${isPlaying ? 'rm-cover--playing' : ''}`}
          />
        ) : (
          <div className="rm-cover-placeholder">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
        )}
      </div>

      {/* ── Info + corazón ── */}
      <div className="rm-info-row">
        <div className="rm-info-text">
          <p className="rm-track-name">{currentTrack?.name}</p>
          <p className="rm-track-artist">{currentTrack?.artist}</p>
        </div>
        <button
          className={`rm-heart-btn ${isFavorite ? 'rm-heart-btn--active' : ''}`}
          onClick={onFavorite}
          disabled={favoriteLoading}
        >
          <svg viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="26" height="26">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      {/* ── Progreso ── */}
      <div className="rm-progress-wrap">
        <div className="rm-progress-track">
          <div className="rm-progress-fill" style={{ width: `${progressPct}%` }} />
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="1"
            value={currentTime}
            onChange={onSeek}
            className="rm-progress-input"
          />
        </div>
        <div className="rm-progress-times">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* ── Controles ── */}
      <div className="rm-controls">
        <button className="rm-ctrl-btn rm-skip" onClick={onPrev} disabled={youtubeLoading}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
          </svg>
        </button>

        <button className="rm-ctrl-btn rm-play-pause" onClick={onPlay} disabled={youtubeLoading}>
          {youtubeLoading ? (
            <svg viewBox="0 0 50 50" width="28" height="28">
              <circle cx="25" cy="25" r="18" fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray="80" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite"/>
              </circle>
            </svg>
          ) : isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        <button className="rm-ctrl-btn rm-skip" onClick={onNext} disabled={youtubeLoading}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default Reproductor_Movil;