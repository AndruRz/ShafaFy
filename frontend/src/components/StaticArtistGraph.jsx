// src/components/StaticArtistGraph.jsx
import { useEffect, useRef, useState } from "react";

// ── Datos estáticos del grafo ───────────────────────────────────────────────
const MODES = {
  artistas: {
    label: "Grafo de artistas",
    nodes: [
      { id: "bb",  name: "Bad Bunny",      initial: "B",  tag: "Reggaeton · Latin trap", plays: 312, listened: true,  r: 36, x: 340, y: 130 },
      { id: "jb",  name: "J Balvin",       initial: "JB", tag: "Reggaeton · Urbano",     plays: 248, listened: true,  r: 28, x: 185, y: 215 },
      { id: "kg",  name: "Karol G",        initial: "K",  tag: "Reggaeton · Pop",        plays: 189, listened: true,  r: 26, x: 500, y: 205 },
      { id: "ra",  name: "Rauw Alejandro", initial: "R",  tag: "Urbano latino",           plays: 0,   listened: false, r: 19, x: 118, y: 335 },
      { id: "oz",  name: "Ozuna",          initial: "O",  tag: "Reggaeton · Bachata",    plays: 0,   listened: false, r: 18, x: 308, y: 318 },
      { id: "fe",  name: "Feid",           initial: "F",  tag: "Urbano · Estéreo",       plays: 0,   listened: false, r: 17, x: 392, y: 325 },
      { id: "ma",  name: "Maluma",         initial: "M",  tag: "Reggaeton · Pop",        plays: 0,   listened: false, r: 17, x: 562, y: 325 },
      { id: "mt",  name: "Myke Towers",    initial: "MT", tag: "Trap · Reggaeton",       plays: 0,   listened: false, r: 15, x: 68,  y: 178 },
      { id: "an",  name: "Anuel AA",       initial: "A",  tag: "Trap latino",            plays: 0,   listened: false, r: 15, x: 622, y: 162 },
    ],
    edges: [
      { s: "bb", t: "jb", type: "collab" },
      { s: "bb", t: "kg", type: "collab" },
      { s: "jb", t: "ra", type: "listen" },
      { s: "jb", t: "oz", type: "listen" },
      { s: "kg", t: "fe", type: "listen" },
      { s: "kg", t: "ma", type: "listen" },
      { s: "bb", t: "oz", type: "listen" },
      { s: "jb", t: "mt", type: "listen" },
      { s: "kg", t: "an", type: "listen" },
      { s: "ra", t: "oz", type: "listen" },
      { s: "fe", t: "ma", type: "listen" },
    ],
  },
  recomendadas: {
    label: "Canciones recomendadas",
    nodes: [
      { id: "bb",  name: "Bad Bunny",          initial: "B",  tag: "Tu artista #1",             plays: 312, listened: true,  r: 34, x: 340, y: 130 },
      { id: "jb",  name: "J Balvin",           initial: "JB", tag: "Tu artista #2",             plays: 248, listened: true,  r: 27, x: 185, y: 215 },
      { id: "kg",  name: "Karol G",            initial: "K",  tag: "Tu artista #3",             plays: 189, listened: true,  r: 25, x: 500, y: 205 },
      { id: "s1",  name: "MONACO",             initial: "♪",  tag: "Recomendada · Bad Bunny",   plays: 0,   listened: false, r: 20, x: 200, y: 310, song: true },
      { id: "s2",  name: "Con Altura",         initial: "♪",  tag: "Recomendada · J Balvin",    plays: 0,   listened: false, r: 20, x: 340, y: 320, song: true },
      { id: "s3",  name: "Gatúbela",           initial: "♪",  tag: "Recomendada · Karol G",     plays: 0,   listened: false, r: 20, x: 480, y: 310, song: true },
      { id: "s4",  name: "Tití Me Preguntó",   initial: "♪",  tag: "Recomendada · Bad Bunny",   plays: 0,   listened: false, r: 18, x: 120, y: 210, song: true },
      { id: "s5",  name: "Ay Vamos",           initial: "♪",  tag: "Recomendada · J Balvin",    plays: 0,   listened: false, r: 18, x: 580, y: 270, song: true },
    ],
    edges: [
      { s: "bb", t: "s1", type: "recommend" },
      { s: "bb", t: "s2", type: "recommend" },
      { s: "jb", t: "s1", type: "recommend" },
      { s: "jb", t: "s2", type: "recommend" },
      { s: "kg", t: "s3", type: "recommend" },
      { s: "kg", t: "s2", type: "recommend" },
      { s: "bb", t: "s4", type: "recommend" },
      { s: "jb", t: "s4", type: "recommend" },
      { s: "jb", t: "s5", type: "recommend" },
      { s: "kg", t: "s5", type: "recommend" },
    ],
  },
};

// ── Colores según tipo ──────────────────────────────────────────────────────
const EDGE_COLOR = {
  collab:    { stroke: "#f59e0b", width: 2,   dash: "6,3",  opacity: 0.8 },
  listen:    { stroke: "rgba(255,255,255,0.15)", width: 1.5, dash: null, opacity: 1 },
  recommend: { stroke: "#3b82f6", width: 1.5, dash: "5,3",  opacity: 0.7 },
};

function StaticArtistGraph() {
  const [mode, setMode]       = useState("artistas");
  const [tooltip, setTooltip] = useState(null); // { x, y, node }
  const [hovered, setHovered] = useState(null);
  const svgRef = useRef(null);

  const data = MODES[mode];

  // Mapa rápido id → node
  const nodeMap = Object.fromEntries(data.nodes.map(n => [n.id, n]));

  const handleMouseEnter = (e, node) => {
    const svg  = svgRef.current;
    const rect = svg.getBoundingClientRect();
    // Convertir coordenadas SVG a pantalla
    const scaleX = rect.width  / 680;
    const scaleY = rect.height / 420;
    setTooltip({
      x: node.x * scaleX + rect.left,
      y: node.y * scaleY + rect.top - node.r * scaleY - 12,
      node,
    });
    setHovered(node.id);
  };

  const handleMouseLeave = () => {
    setTooltip(null);
    setHovered(null);
  };

  return (
    <div className="static-graph-container">
      {/* Botones de modo */}
      <div className="static-graph-btn-bar">
        {Object.entries(MODES).map(([key, val]) => (
          <button
            key={key}
            className={`graph-btn ${mode === key ? "active" : ""}`}
            onClick={() => { setMode(key); setTooltip(null); setHovered(null); }}
          >
            {key === "artistas" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/>
                <circle cx="12" cy="19" r="2"/>
                <line x1="7" y1="5" x2="17" y2="5"/>
                <line x1="6.5" y1="7" x2="11" y2="17"/>
                <line x1="17.5" y1="7" x2="13" y2="17"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
            )}
            <span>{val.label}</span>
          </button>
        ))}
      </div>

      {/* SVG del grafo */}
      <div className="static-graph-canvas">
        <svg
          ref={svgRef}
          viewBox="0 0 680 420"
          width="100%"
          style={{ display: "block" }}
        >
          <defs>
            <filter id="sg-glow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="sg-glow2">
              <feGaussianBlur stdDeviation="5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* ── Aristas ── */}
          <g>
            {data.edges.map((edge, i) => {
              const src = nodeMap[edge.s];
              const tgt = nodeMap[edge.t];
              if (!src || !tgt) return null;
              const cfg = EDGE_COLOR[edge.type];
              const isActive = hovered === edge.s || hovered === edge.t;
              return (
                <line
                  key={i}
                  x1={src.x} y1={src.y}
                  x2={tgt.x} y2={tgt.y}
                  stroke={cfg.stroke}
                  strokeWidth={isActive ? cfg.width * 1.8 : cfg.width}
                  strokeDasharray={cfg.dash || undefined}
                  opacity={isActive ? Math.min(cfg.opacity * 1.5, 1) : cfg.opacity}
                  style={{ transition: "opacity .2s, stroke-width .2s" }}
                />
              );
            })}
          </g>

          {/* ── Nodos ── */}
          <g>
            {data.nodes.map((node) => {
              const isHov = hovered === node.id;
              const isConnected = hovered
                ? data.edges.some(e => (e.s === hovered && e.t === node.id) || (e.t === hovered && e.s === node.id))
                : false;
              const dimmed = hovered && !isHov && !isConnected;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  style={{ cursor: "pointer", opacity: dimmed ? 0.35 : 1, transition: "opacity .2s" }}
                  onMouseEnter={(e) => handleMouseEnter(e, node)}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Halo al hover */}
                  {isHov && (
                    <circle
                      r={node.r + 8}
                      fill="none"
                      stroke={node.listened ? "#1DB954" : node.song ? "#3b82f6" : "#7c3aed"}
                      strokeWidth="1.5"
                      opacity="0.4"
                      className="sg-halo"
                    />
                  )}
                  <circle
                    r={node.r}
                    fill={
                      node.song     ? "rgba(59,130,246,0.18)"
                      : node.listened ? "rgba(29,185,84,0.18)"
                      :                 "rgba(124,58,237,0.18)"
                    }
                    stroke={
                      node.song     ? "#3b82f6"
                      : node.listened ? "#1DB954"
                      :                 "#7c3aed"
                    }
                    strokeWidth={node.listened ? 2.5 : 1.8}
                    filter={node.listened ? "url(#sg-glow)" : undefined}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={node.r * 0.62}
                    fontWeight="800"
                    fill={
                      node.song     ? "#60a5fa"
                      : node.listened ? "#1DB954"
                      :                 "#a78bfa"
                    }
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {node.initial}
                  </text>
                  <text
                    textAnchor="middle"
                    y={node.r + 13}
                    fontSize="9.5"
                    fontWeight="600"
                    fill="rgba(255,255,255,0.65)"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {node.name.length > 12 ? node.name.slice(0, 11) + "…" : node.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Tooltip flotante */}
        {tooltip && (
          <div
            className="sg-tooltip"
            style={{
              position: "fixed",
              left: tooltip.x,
              top:  tooltip.y,
              transform: "translate(-50%, -100%)",
              pointerEvents: "none",
              zIndex: 9999,
            }}
          >
            <div className="sg-tt-name">{tooltip.node.name}</div>
            <div className="sg-tt-tag">{tooltip.node.tag}</div>
            {tooltip.node.plays > 0 && (
              <div className="sg-tt-plays">▶ {tooltip.node.plays} plays este mes</div>
            )}
            <div className="sg-tt-type">
              {tooltip.node.listened ? "✓ Escuchado" : tooltip.node.song ? "♪ Recomendada" : "~ Relacionado"}
            </div>
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="static-graph-legend">
        <div className="sg-legend-item">
          <div className="sg-dot sg-dot-listened" />
          <span>Artistas que escuchas</span>
        </div>
        <div className="sg-legend-item">
          <div className="sg-dot sg-dot-related" />
          <span>{mode === "recomendadas" ? "Canciones recomendadas" : "Artistas relacionados"}</span>
        </div>
        {mode === "artistas" && (
          <div className="sg-legend-item">
            <div className="sg-line sg-line-collab" />
            <span>Colaboración directa</span>
          </div>
        )}
        {mode === "recomendadas" && (
          <div className="sg-legend-item">
            <div className="sg-line sg-line-recommend" />
            <span>Basado en lo que escuchas este mes</span>
          </div>
        )}
        <div className="sg-legend-item sg-legend-hint">
          <span>Pasa el cursor sobre los nodos</span>
        </div>
      </div>
    </div>
  );
}

export default StaticArtistGraph;