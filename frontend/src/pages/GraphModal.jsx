// src/pages/GraphModal.jsx
import { useEffect, useRef, useState } from 'react';
import graphService from '../services/graphService';
import { ArtistGraph } from '../data_structures/Grafos';

function GraphModal({ onClose }) {
  const svgRef      = useRef(null);
  const wrapRef     = useRef(null);
  const tooltipRef  = useRef(null);
  const [loading, setLoading] = useState(true);
  const [stats,   setStats]   = useState({ nodeCount: 0, edgeCount: 0 });
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    loadAndRender();
    // Cerrar con Escape
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

      setLoading(false);
      // Esperar a que el DOM esté listo antes de renderizar D3
      requestAnimationFrame(() => renderD3(graph));
    } catch {
      setLoading(false);
      setIsEmpty(true);
    }
  };

  const renderD3 = (graph) => {
    const container = wrapRef.current;
    const svgEl     = svgRef.current;
    if (!container || !svgEl) return;

    const W = container.clientWidth  || 800;
    const H = container.clientHeight || 450;

    const { nodes, links } = graph.toD3Format();

    // ── Cargar D3 dinámicamente (no está en package.json por defecto) ──────
    // Si ya está disponible en window, usarlo directo
    const runD3 = (d3) => {
      // Limpiar SVG previo
      d3.select(svgEl).selectAll('*').remove();

      const svg = d3.select(svgEl)
        .attr('viewBox', `0 0 ${W} ${H}`)
        .attr('width', W)
        .attr('height', H);

      // ── Definir gradientes y filtros ────────────────────────────────────
      const defs = svg.append('defs');

      // Filtro glow para nodos escuchados
      const glowFilter = defs.append('filter').attr('id', 'glow');
      glowFilter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
      const feMerge = glowFilter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'coloredBlur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

      // ── Zoom + pan ──────────────────────────────────────────────────────
      const g    = svg.append('g');
      const zoom = d3.zoom()
        .scaleExtent([0.3, 4])
        .on('zoom', (event) => g.attr('transform', event.transform));
      svg.call(zoom);

      // ── Simulación de fuerzas ───────────────────────────────────────────
      const simulation = d3.forceSimulation(nodes)
        .force('link',   d3.forceLink(links).id(d => d.id).distance(d => 120 - Math.min(d.value * 3, 60)).strength(0.5))
        .force('charge', d3.forceManyBody().strength(-280))
        .force('center', d3.forceCenter(W / 2, H / 2))
        .force('collision', d3.forceCollide().radius(d => d.radius + 12));

      // ── Aristas ─────────────────────────────────────────────────────────
      const link = g.append('g').selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', d => d.type === 'collaboration' ? '#f59e0b' : 'rgba(255,255,255,0.15)')
        .attr('stroke-width', d => Math.max(1, Math.min(d.value / 5, 4)))
        .attr('stroke-dasharray', d => d.type === 'collaboration' ? '5,3' : null)
        .attr('opacity', 0.7);

      // ── Nodos ───────────────────────────────────────────────────────────
      const node = g.append('g').selectAll('g')
        .data(nodes)
        .join('g')
        .attr('cursor', 'pointer')
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

      // Círculo del nodo
      node.append('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => {
          if (d.isListened) return 'rgba(29,185,84,0.25)';
          return 'rgba(124,58,237,0.2)';
        })
        .attr('stroke', d => d.isListened ? '#1DB954' : '#7c3aed')
        .attr('stroke-width', d => d.isListened ? 2.5 : 1.5)
        .attr('filter', d => d.isListened ? 'url(#glow)' : null);

      // Inicial del artista dentro del nodo
      node.append('text')
        .text(d => (d.name || '?').charAt(0).toUpperCase())
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', d => d.radius * 0.7)
        .attr('font-weight', '800')
        .attr('fill', d => d.isListened ? '#1DB954' : '#a78bfa')
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

      // ── Tooltip ─────────────────────────────────────────────────────────
      const tooltip = d3.select(tooltipRef.current);

      node
        .on('mouseover', (event, d) => {
          tooltip
            .style('opacity', '1')
            .style('left', (event.offsetX + 14) + 'px')
            .style('top',  (event.offsetY - 10) + 'px')
            .html(`
              <div class="graph-tooltip-name">${d.name}</div>
              ${d.isListened ? `<div class="graph-tooltip-plays">▶ ${d.playCount} plays este mes</div>` : ''}
              <div class="graph-tooltip-type">${d.isListened ? '✓ Escuchado' : '~ Relacionado'}</div>
            `);
        })
        .on('mousemove', (event) => {
          tooltip
            .style('left', (event.offsetX + 14) + 'px')
            .style('top',  (event.offsetY - 10) + 'px');
        })
        .on('mouseout', () => tooltip.style('opacity', '0'));

      // ── Tick ────────────────────────────────────────────────────────────
      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        node.attr('transform', d => `translate(${d.x},${d.y})`);
      });

      // Centrar al inicio
      svg.call(zoom.transform, d3.zoomIdentity.translate(W * 0.1, H * 0.1).scale(0.85));
    };

    // Cargar D3 desde CDN si no está disponible
    if (window.d3) {
      runD3(window.d3);
    } else {
      const script    = document.createElement('script');
      script.src      = 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js';
      script.onload   = () => runD3(window.d3);
      script.onerror  = () => setIsEmpty(true);
      document.head.appendChild(script);
    }
  };

  return (
    <div className="graph-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="graph-modal">

        {/* ── Header ── */}
        <div className="graph-modal-header">
          <div className="graph-modal-title">
            <div className="graph-modal-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <circle cx="5"  cy="5"  r="2"/><circle cx="19" cy="5"  r="2"/>
                <circle cx="12" cy="19" r="2"/><circle cx="5"  cy="12" r="2"/>
                <line x1="7" y1="5" x2="17" y2="5"/>
                <line x1="5" y1="7" x2="5" y2="10"/>
                <line x1="7" y1="12" x2="10" y2="17"/>
                <line x1="19" y1="7" x2="14" y2="17"/>
              </svg>
            </div>
            <div>
              <h2>Tu grafo de artistas</h2>
              <p>Conexiones basadas en tu historial de escucha</p>
            </div>
          </div>
          <button className="graph-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* ── Stats ── */}
        {!loading && !isEmpty && (
          <div className="graph-modal-stats">
            <div className="graph-stat">
              <div className="graph-stat-dot-listened"/>
              <span>{stats.nodeCount}</span> artistas en tu grafo
            </div>
            <div className="graph-stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                <path d="M5 12h14"/>
              </svg>
              <span>{stats.edgeCount}</span> conexiones
            </div>
            <div className="graph-stat" style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
              Arrastra los nodos · Scroll para zoom
            </div>
          </div>
        )}

        {/* ── Canvas ── */}
        <div className="graph-modal-canvas" ref={wrapRef}>
          {loading ? (
            <div className="graph-empty">
              <svg viewBox="0 0 50 50" width="40" height="40">
                <circle cx="25" cy="25" r="18" fill="none" stroke="#7c3aed" strokeWidth="4" strokeDasharray="80" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.9s" repeatCount="indefinite"/>
                </circle>
              </svg>
              <h3>Construyendo tu grafo...</h3>
              <p>Analizando tu historial de escucha</p>
            </div>
          ) : isEmpty ? (
            <div className="graph-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="56" height="56">
                <circle cx="5"  cy="5"  r="2"/><circle cx="19" cy="5"  r="2"/>
                <circle cx="12" cy="19" r="2"/>
                <line x1="7" y1="5" x2="17" y2="5" strokeDasharray="3,2"/>
                <line x1="7" y1="6" x2="11" y2="17" strokeDasharray="3,2"/>
              </svg>
              <h3>Grafo vacío por ahora</h3>
              <p>Escucha más música para que el grafo empiece a conectar tus artistas favoritos.</p>
            </div>
          ) : (
            <>
              <svg ref={svgRef} />
              <div
                ref={tooltipRef}
                className="graph-tooltip"
                style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
              />
            </>
          )}
        </div>

        {/* ── Leyenda ── */}
        {!loading && !isEmpty && (
          <div className="graph-legend">
            <div className="graph-legend-item">
              <div className="graph-stat-dot-listened"/>
              Artistas que escuchas
            </div>
            <div className="graph-legend-item">
              <div className="graph-stat-dot-related"/>
              Artistas relacionados
            </div>
            <div className="graph-legend-item">
              <div style={{ width: 20, height: 2, background: '#f59e0b', borderRadius: 1, borderTop: '1px dashed #f59e0b' }}/>
              Colaboración directa
            </div>
            <div className="graph-legend-item">
              <div style={{ width: 20, height: 2, background: 'rgba(255,255,255,0.2)', borderRadius: 1 }}/>
              Co-escuchados
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default GraphModal;