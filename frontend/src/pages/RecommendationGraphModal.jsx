// src/pages/RecommendationGraphModal.jsx
//
// Modal que muestra el grafo colaborativo de CANCIONES RECOMENDADAS.
// Visualiza: mis artistas (verde) → artistas vecinos (morado) → canciones recomendadas (dorado)
// Al hacer clic en un nodo artista vecino, muestra las canciones del pool que tiene.
//
import { useEffect, useRef, useState } from 'react';
import graphService from '../services/graphService';
import { ArtistGraph } from '../data_structures/Grafos';

function RecommendationGraphModal({ onClose, recommendedTracks = [], onPlayTrack }) {
  const svgRef     = useRef(null);
  const wrapRef    = useRef(null);
  const tooltipRef = useRef(null);

  const [loading,        setLoading]        = useState(true);
  const [isEmpty,        setIsEmpty]         = useState(false);
  const [stats,          setStats]           = useState({ nodeCount: 0, edgeCount: 0 });
  const [selectedArtist, setSelectedArtist] = useState(null); // artista clickeado

  // Canciones del artista seleccionado (del pool recomendado)
  const tracksForArtist = selectedArtist
    ? recommendedTracks.filter(
        t => (t.artistId === selectedArtist.id || t.artistName === selectedArtist.name)
      )
    : [];

  useEffect(() => {
    loadAndRender();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const loadAndRender = async () => {
    try {
      setLoading(true);
      const rawData = await graphService.getGraphData();

      const graph = new ArtistGraph();
      graph.loadFromData(rawData);

      const s = graph.getStats();
      setStats(s);

      if (graph.isEmpty()) {
        setIsEmpty(true);
        setLoading(false);
        return;
      }

      // Marcar qué nodos tienen canciones recomendadas en el pool
      const recommendedArtistIds = new Set(recommendedTracks.map(t => t.artistId));

      setLoading(false);
      requestAnimationFrame(() => renderD3(graph, recommendedArtistIds));
    } catch {
      setLoading(false);
      setIsEmpty(true);
    }
  };

  const renderD3 = (graph, recommendedArtistIds) => {
    const container = wrapRef.current;
    const svgEl     = svgRef.current;
    if (!container || !svgEl) return;

    const W = container.clientWidth  || 800;
    const H = container.clientHeight || 420;

    const { nodes, links } = graph.toD3Format();

    // Enriquecer nodos con info de si tienen canciones recomendadas
    const enrichedNodes = nodes.map(n => ({
      ...n,
      hasRecommendations: recommendedArtistIds.has(n.id),
    }));

    const runD3 = (d3) => {
      d3.select(svgEl).selectAll('*').remove();

      const svg = d3.select(svgEl)
        .attr('viewBox', `0 0 ${W} ${H}`)
        .attr('width', W)
        .attr('height', H);

      const defs = svg.append('defs');

      // Glow verde para artistas escuchados
      const glowGreen = defs.append('filter').attr('id', 'glow-green');
      glowGreen.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
      const mg = glowGreen.append('feMerge');
      mg.append('feMergeNode').attr('in', 'coloredBlur');
      mg.append('feMergeNode').attr('in', 'SourceGraphic');

      // Glow dorado para artistas con canciones recomendadas
      const glowGold = defs.append('filter').attr('id', 'glow-gold');
      glowGold.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'coloredBlur');
      const mgGold = glowGold.append('feMerge');
      mgGold.append('feMergeNode').attr('in', 'coloredBlur');
      mgGold.append('feMergeNode').attr('in', 'SourceGraphic');

      const g    = svg.append('g');
      const zoom = d3.zoom()
        .scaleExtent([0.25, 4])
        .on('zoom', (event) => g.attr('transform', event.transform));
      svg.call(zoom);

      const simulation = d3.forceSimulation(enrichedNodes)
        .force('link',      d3.forceLink(links).id(d => d.id).distance(130).strength(0.4))
        .force('charge',    d3.forceManyBody().strength(-320))
        .force('center',    d3.forceCenter(W / 2, H / 2))
        .force('collision', d3.forceCollide().radius(d => d.radius + 14));

      // ── Aristas ────────────────────────────────────────────────────────────
      const link = g.append('g').selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', d => {
          if (d.type === 'collaboration') return '#f59e0b';
          return 'rgba(255,255,255,0.12)';
        })
        .attr('stroke-width', d => Math.max(1, Math.min(d.value / 6, 4)))
        .attr('stroke-dasharray', d => d.type === 'collaboration' ? '5,3' : null)
        .attr('opacity', 0.65);

      // ── Nodos ──────────────────────────────────────────────────────────────
      const node = g.append('g').selectAll('g')
        .data(enrichedNodes)
        .join('g')
        .attr('cursor', d => d.hasRecommendations ? 'pointer' : 'default')
        .call(
          d3.drag()
            .on('start', (event, d) => {
              if (!event.active) simulation.alphaTarget(0.3).restart();
              d.fx = d.x; d.fy = d.y;
            })
            .on('drag',  (event, d) => { d.fx = event.x; d.fy = event.y; })
            .on('end',   (event, d) => {
              if (!event.active) simulation.alphaTarget(0);
              d.fx = null; d.fy = null;
            })
        );

      // Círculo exterior pulsante para artistas con canciones (anillo dorado)
      node.filter(d => d.hasRecommendations)
        .append('circle')
        .attr('r', d => d.radius + 8)
        .attr('fill', 'none')
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.5)
        .attr('stroke-dasharray', '4,3');

      // Círculo principal del nodo
      node.append('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => {
          if (d.isListened)          return 'rgba(29,185,84,0.25)';   // mis artistas → verde
          if (d.hasRecommendations)  return 'rgba(245,158,11,0.2)';   // con canciones → dorado
          return 'rgba(124,58,237,0.18)';                              // relacionados → morado
        })
        .attr('stroke', d => {
          if (d.isListened)         return '#1DB954';
          if (d.hasRecommendations) return '#f59e0b';
          return '#7c3aed';
        })
        .attr('stroke-width', d => (d.isListened || d.hasRecommendations) ? 2.5 : 1.5)
        .attr('filter', d => {
          if (d.isListened)         return 'url(#glow-green)';
          if (d.hasRecommendations) return 'url(#glow-gold)';
          return null;
        });

      // Letra inicial dentro del nodo
      node.append('text')
        .text(d => (d.name || '?').charAt(0).toUpperCase())
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', d => d.radius * 0.7)
        .attr('font-weight', '800')
        .attr('fill', d => {
          if (d.isListened)         return '#1DB954';
          if (d.hasRecommendations) return '#f59e0b';
          return '#a78bfa';
        })
        .attr('pointer-events', 'none');

      // Nombre debajo del nodo
      node.append('text')
        .text(d => d.name.length > 14 ? d.name.slice(0, 13) + '…' : d.name)
        .attr('text-anchor', 'middle')
        .attr('y', d => d.radius + 14)
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('fill', 'rgba(255,255,255,0.7)')
        .attr('pointer-events', 'none');

      // Ícono de nota musical encima de nodos con canciones recomendadas
      node.filter(d => d.hasRecommendations && !d.isListened)
        .append('text')
        .text('♪')
        .attr('text-anchor', 'middle')
        .attr('y', d => -(d.radius + 6))
        .attr('font-size', '11px')
        .attr('fill', '#f59e0b')
        .attr('pointer-events', 'none');

      // ── Tooltip ────────────────────────────────────────────────────────────
      const tooltip = d3.select(tooltipRef.current);

      node
        .on('mouseover', (event, d) => {
          const trackCount = recommendedTracks.filter(t => t.artistId === d.id).length;
          tooltip
            .style('opacity', '1')
            .style('left', (event.offsetX + 14) + 'px')
            .style('top',  (event.offsetY - 10) + 'px')
            .html(`
              <div class="graph-tooltip-name">${d.name}</div>
              ${d.isListened
                ? `<div class="graph-tooltip-plays">▶ ${d.playCount} plays este mes</div>
                   <div class="graph-tooltip-type" style="color:#1DB954">✓ Lo escuchas</div>`
                : d.hasRecommendations
                  ? `<div class="graph-tooltip-type" style="color:#f59e0b">♪ ${trackCount} canción${trackCount !== 1 ? 'es' : ''} recomendada${trackCount !== 1 ? 's' : ''}</div>
                     <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:2px">Clic para ver canciones</div>`
                  : `<div class="graph-tooltip-type" style="color:#a78bfa">~ Artista relacionado</div>`
              }
            `);
        })
        .on('mousemove', (event) => {
          tooltip
            .style('left', (event.offsetX + 14) + 'px')
            .style('top',  (event.offsetY - 10) + 'px');
        })
        .on('mouseout', () => tooltip.style('opacity', '0'))
        .on('click', (event, d) => {
          if (d.hasRecommendations) {
            setSelectedArtist({ id: d.id, name: d.name });
          }
        });

      // ── Tick ──────────────────────────────────────────────────────────────
      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);
        node.attr('transform', d => `translate(${d.x},${d.y})`);
      });

      svg.call(zoom.transform, d3.zoomIdentity.translate(W * 0.08, H * 0.08).scale(0.88));
    };

    if (window.d3) {
      runD3(window.d3);
    } else {
      const script   = document.createElement('script');
      script.src     = 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js';
      script.onload  = () => runD3(window.d3);
      script.onerror = () => setIsEmpty(true);
      document.head.appendChild(script);
    }
  };

  return (
    <div
      className="graph-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="graph-modal">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="graph-modal-header">
          <div className="graph-modal-title">
            <div className="graph-modal-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M9 19V6l12-3v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <div>
              <h2>Grafo de recomendaciones</h2>
              <p>Canciones que otros usuarios escucharon</p>
            </div>
          </div>
          <button className="graph-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        {!loading && !isEmpty && (
          <div className="graph-modal-stats">
            <div className="graph-stat">
              <div className="graph-stat-dot-listened"/>
              <span>{stats.nodeCount}</span> artistas conectados
            </div>
            <div className="graph-stat">
              <span style={{ color: '#f59e0b', fontSize: '12px' }}>♪</span>
              <span>{recommendedTracks.length}</span> canciones recomendadas
            </div>
            <div className="graph-stat" style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
              Clic en nodo dorado · Scroll para zoom
            </div>
          </div>
        )}

        {/* ── Layout principal: grafo + panel lateral ────────────────────── */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* Grafo */}
          <div
            className="graph-modal-canvas"
            ref={wrapRef}
            style={{ flex: 1, position: 'relative' }}
          >
            {loading ? (
              <div className="graph-empty">
                <svg viewBox="0 0 50 50" width="40" height="40">
                  <circle cx="25" cy="25" r="18" fill="none" stroke="#f59e0b" strokeWidth="4"
                    strokeDasharray="80" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate"
                      from="0 25 25" to="360 25 25" dur="0.9s" repeatCount="indefinite"/>
                  </circle>
                </svg>
                <h3>Construyendo grafo...</h3>
                <p>Mapeando conexiones colaborativas</p>
              </div>
            ) : isEmpty ? (
              <div className="graph-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="52" height="52">
                  <path d="M9 19V6l12-3v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>
                <h3>Sin conexiones aún</h3>
                <p>Sigue escuchando para generar recomendaciones colaborativas.</p>
              </div>
            ) : (
              <>
                <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
                <div
                  ref={tooltipRef}
                  className="graph-tooltip"
                  style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
                />
              </>
            )}
          </div>

          {/* Panel lateral de canciones del artista seleccionado */}
          {selectedArtist && tracksForArtist.length > 0 && (
            <div className="rec-graph-side-panel">
              <div className="rec-graph-side-header">
                <div>
                  <p className="rec-graph-side-eyebrow">Canciones recomendadas de</p>
                  <h3 className="rec-graph-side-artist">{selectedArtist.name}</h3>
                </div>
                <button
                  className="rec-graph-side-close"
                  onClick={() => setSelectedArtist(null)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <div className="rec-graph-track-list">
                {tracksForArtist.map(track => (
                  <div
                    key={track.trackId || track.id}
                    className="rec-graph-track-item"
                    onClick={() => {
                      if (onPlayTrack) onPlayTrack(track);
                    }}
                  >
                    {track.albumImage ? (
                      <img
                        src={track.albumImage}
                        alt={track.albumName}
                        className="rec-graph-track-img"
                      />
                    ) : (
                      <div className="rec-graph-track-img-placeholder">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                      </div>
                    )}
                    <div className="rec-graph-track-info">
                      <p className="rec-graph-track-name">{track.trackName || track.name}</p>
                      <p className="rec-graph-track-meta">
                        {track.userCount > 1
                          ? `${track.userCount} usuarios lo escucharon`
                          : track.reason || 'Recomendada para ti'}
                      </p>
                    </div>
                    <div className="rec-graph-track-play">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Leyenda ────────────────────────────────────────────────────── */}
        {!loading && !isEmpty && (
          <div className="graph-legend">
            <div className="graph-legend-item">
              <div className="graph-stat-dot-listened"/>
              Lo que escuchas
            </div>
            <div className="graph-legend-item">
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(245,158,11,0.3)', border: '2px solid #f59e0b' }}/>
              Con canciones recomendadas
            </div>
            <div className="graph-legend-item">
              <div className="graph-stat-dot-related"/>
              Solo relacionado
            </div>
            <div className="graph-legend-item" style={{ color: '#f59e0b', fontSize: '0.72rem' }}>
              ♪ = hay canciones en el pool
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default RecommendationGraphModal;