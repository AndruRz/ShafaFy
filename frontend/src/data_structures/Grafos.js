// src/data_structures/Grafos.js
//
// ─────────────────────────────────────────────────────────────────────────────
//  GRAFO DE ARTISTAS — estructura en memoria para el frontend
//
//  Uso:
//    1. Recibe los datos del backend (nodos + aristas)
//    2. Construye la lista de adyacencia
//    3. Expone métodos para recorrer el grafo (BFS) y preparar datos para D3
//
//  Esta clase se usa en GraphModal.jsx para renderizar la visualización
// ─────────────────────────────────────────────────────────────────────────────

export class ArtistGraph {
  constructor() {
    this.nodes     = new Map(); // id → { id, name, playCount, isListened }
    this.adjacency = new Map(); // id → [{ targetId, weight, type }]
  }

  // ── Cargar datos desde el backend ──────────────────────────────────────────
  loadFromData({ nodes = [], edges = [] }) {
    this.nodes.clear();
    this.adjacency.clear();

    for (const node of nodes) {
      this.nodes.set(node.id, node);
      this.adjacency.set(node.id, []);
    }

    for (const edge of edges) {
      // Grafo no dirigido — agregar en ambas direcciones
      if (this.adjacency.has(edge.source)) {
        this.adjacency.get(edge.source).push({
          targetId: edge.target,
          weight:   edge.weight,
          type:     edge.type,
        });
      }
      if (this.adjacency.has(edge.target)) {
        this.adjacency.get(edge.target).push({
          targetId: edge.source,
          weight:   edge.weight,
          type:     edge.type,
        });
      }
    }
  }

  // ── BFS desde un nodo — devuelve vecinos por niveles ──────────────────────
  bfs(startId, maxDepth = 2) {
    if (!this.nodes.has(startId)) return [];

    const visited = new Set([startId]);
    const result  = [];
    const queue   = [{ id: startId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift();
      if (depth >= maxDepth) continue;

      const neighbors = this.adjacency.get(id) || [];
      for (const edge of neighbors) {
        if (!visited.has(edge.targetId)) {
          visited.add(edge.targetId);
          const node = this.nodes.get(edge.targetId);
          if (node) {
            result.push({ ...node, depth: depth + 1, weight: edge.weight });
            queue.push({ id: edge.targetId, depth: depth + 1 });
          }
        }
      }
    }

    return result;
  }

  // ── Preparar datos para D3 force simulation ────────────────────────────────
  // D3 necesita arrays de { id, name, ... } y { source, target, value }
  toD3Format() {
    const d3Nodes = [...this.nodes.values()].map(n => ({
      id:         n.id,
      name:       n.name,
      playCount:  n.playCount  || 0,
      isListened: n.isListened || false,
      // Tamaño del nodo proporcional al playCount
      radius: n.isListened
        ? Math.max(28, Math.min(50, 20 + (n.playCount || 0) * 1.5))
        : 20,
    }));

    const d3Links = [];
    const seen    = new Set();

    for (const [sourceId, edges] of this.adjacency.entries()) {
      for (const edge of edges) {
        const key = [sourceId, edge.targetId].sort().join('--');
        if (!seen.has(key)) {
          seen.add(key);
          d3Links.push({
            source: sourceId,
            target: edge.targetId,
            value:  edge.weight,
            type:   edge.type,
          });
        }
      }
    }

    return { nodes: d3Nodes, links: d3Links };
  }

  // ── Estadísticas del grafo ─────────────────────────────────────────────────
  getStats() {
    let edgeCount = 0;
    for (const edges of this.adjacency.values()) {
      edgeCount += edges.length;
    }
    return {
      nodeCount: this.nodes.size,
      edgeCount: edgeCount / 2, // dividir por 2 porque es no dirigido
    };
  }

  isEmpty() {
    return this.nodes.size === 0;
  }
}