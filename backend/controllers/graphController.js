// controllers/graphController.js
const ArtistGraph = require('../models/ArtistGraph');
const PlayHistory = require('../models/PlayHistory');
const axios       = require('axios');

// ─────────────────────────────────────────────────────────────────────────────
//  CLASE GRAFO EN MEMORIA
//  Se construye desde MongoDB cada vez que se necesita.
//  Usa lista de adyacencia para recorridos BFS/DFS eficientes.
//
//  Nodo  = artista  { id, name }
//  Arista = relación { weight, connectionType }
// ─────────────────────────────────────────────────────────────────────────────
class ArtistGraphInMemory {
  constructor() {
    this.adjacency = new Map(); // artistId → [{ artistId, artistName, weight, type }]
    this.nodes     = new Map(); // artistId → { id, name }
  }

  addNode(id, name) {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, name });
      this.adjacency.set(id, []);
    }
  }

  addEdge(idA, nameA, idB, nameB, weight = 1, type = 'colistened') {
    this.addNode(idA, nameA);
    this.addNode(idB, nameB);

    const edgesA = this.adjacency.get(idA);
    const existA = edgesA.find(e => e.artistId === idB);
    if (existA) existA.weight += weight;
    else edgesA.push({ artistId: idB, artistName: nameB, weight, type });

    const edgesB = this.adjacency.get(idB);
    const existB = edgesB.find(e => e.artistId === idA);
    if (existB) existB.weight += weight;
    else edgesB.push({ artistId: idA, artistName: nameA, weight, type });
  }

  // BFS desde un nodo: devuelve vecinos ordenados por peso hasta profundidad `depth`
  getRelated(startId, depth = 2, limit = 10) {
    if (!this.adjacency.has(startId)) return [];

    const visited = new Set([startId]);
    const result  = [];
    const queue   = [{ id: startId, d: 0 }];

    while (queue.length > 0) {
      const { id, d } = queue.shift();
      if (d >= depth) continue;

      const edges  = this.adjacency.get(id) || [];
      const sorted = [...edges].sort((a, b) => b.weight - a.weight);

      for (const edge of sorted) {
        if (!visited.has(edge.artistId)) {
          visited.add(edge.artistId);
          result.push({
            artistId:   edge.artistId,
            artistName: edge.artistName,
            weight:     edge.weight,
            type:       edge.type,
            depth:      d + 1,
          });
          queue.push({ id: edge.artistId, d: d + 1 });
          if (result.length >= limit * 2) break;
        }
      }
    }

    return result.sort((a, b) => b.weight - a.weight).slice(0, limit);
  }

  // Devuelve todos los nodos y aristas para visualización
  getGraphData() {
    const nodes = [...this.nodes.values()];
    const edges = [];
    const seen  = new Set();

    for (const [fromId, edgeList] of this.adjacency.entries()) {
      for (const edge of edgeList) {
        const key = [fromId, edge.artistId].sort().join('--');
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({
            source: fromId,
            target: edge.artistId,
            weight: edge.weight,
            type:   edge.type,
          });
        }
      }
    }

    return { nodes, edges };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS — Spotify token
// ─────────────────────────────────────────────────────────────────────────────
let _spotifyToken  = null;
let _spotifyExpiry = null;

const getSpotifyToken = async () => {
  const now = Date.now();
  if (_spotifyToken && _spotifyExpiry && now < _spotifyExpiry) return _spotifyToken;

  const clientId     = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await axios.post(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    { headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  _spotifyToken  = res.data.access_token;
  _spotifyExpiry = now + (res.data.expires_in - 100) * 1000;
  return _spotifyToken;
};

// ─────────────────────────────────────────────────────────────────────────────
//  ACTUALIZAR GRAFO — se llama desde historyController al registrar un play
//
//  artistList = [{ id, name }, { id, name }, ...]  (todos los artistas de la canción)
//
//  Crea DOS tipos de aristas:
//    1. colistened   → cada artista nuevo ↔ artistas del historial reciente
//    2. collaboration → artistas de la MISMA canción entre sí (peso 5)
// ─────────────────────────────────────────────────────────────────────────────
exports.updateGraph = async (userId, artistList) => {
  try {
    if (!artistList || artistList.length === 0) return;

    const now    = new Date();
    const recent = await PlayHistory.find({
      userId,
      month: now.getMonth(),
      year:  now.getFullYear(),
    })
      .sort({ lastPlayedAt: -1 })
      .limit(20)
      .select('artistId artistName');

    const ops = [];

    for (const artist of artistList) {
      const newId   = artist.id?.trim();
      const newName = artist.name?.trim();
      if (!newId || !newName) continue;

      // ── 1. Aristas colistened con historial reciente ──────────────────────
      for (const record of recent) {
        const recId   = record.artistId?.trim();
        const recName = record.artistName?.trim();
        if (!recId || recId === newId) continue;

        const [idA, nameA, idB, nameB] =
          newId < recId
            ? [newId, newName, recId, recName]
            : [recId, recName, newId, newName];

        ops.push({
          updateOne: {
            filter: { artistAId: idA, artistBId: idB, connectionType: 'colistened' },
            update: {
              $inc: { weight: 1 },
              $set: { artistAName: nameA, artistBName: nameB, updatedAt: new Date() },
              $addToSet: { users: userId },
            },
            upsert: true,
          },
        });
      }

      // ── 2. Aristas collaboration entre artistas de la misma canción ───────
      for (const other of artistList) {
        const otherId   = other.id?.trim();
        const otherName = other.name?.trim();
        if (!otherId || otherId === newId) continue;

        const [idA, nameA, idB, nameB] =
          newId < otherId
            ? [newId, newName, otherId, otherName]
            : [otherId, otherName, newId, newName];

        ops.push({
          updateOne: {
            filter: { artistAId: idA, artistBId: idB, connectionType: 'collaboration' },
            update: {
              $inc: { weight: 5 }, // colaboración vale más que colistened
              $set: { artistAName: nameA, artistBName: nameB, updatedAt: new Date() },
              $addToSet: { users: userId },
            },
            upsert: true,
          },
        });
      }
    }

    if (ops.length > 0) await ArtistGraph.bulkWrite(ops);

  } catch (err) {
    console.warn('⚠️ Error actualizando grafo:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  AGREGAR COLABORACIONES DE SPOTIFY AL GRAFO
//  Busca canciones del artista con múltiples artistas en Spotify
//  y las agrega como aristas 'collaboration' con peso 10
// ─────────────────────────────────────────────────────────────────────────────
const addCollaborationsToGraph = async (artistId, artistName) => {
  try {
    const token   = await getSpotifyToken();
    const headers = { Authorization: `Bearer ${token}` };

    const res = await axios.get('https://api.spotify.com/v1/search', {
      headers,
      params: {
        q:      `artist:"${artistName}"`,
        type:   'track',
        limit:  50,
        market: 'US',
      },
    });

    const tracks = res.data.tracks?.items || [];
    const ops    = [];

    for (const track of tracks) {
      if (track.artists.length < 2) continue;

      for (const collab of track.artists) {
        if (collab.id === artistId) continue;

        const [idA, nameA, idB, nameB] =
          artistId < collab.id
            ? [artistId, artistName, collab.id, collab.name]
            : [collab.id, collab.name, artistId, artistName];

        ops.push({
          updateOne: {
            filter: { artistAId: idA, artistBId: idB, connectionType: 'collaboration' },
            update: {
              $inc: { weight: 10 },
              $set: { artistAName: nameA, artistBName: nameB, updatedAt: new Date() },
            },
            upsert: true,
          },
        });
      }
    }

    if (ops.length > 0) {
      await ArtistGraph.bulkWrite(ops);
      console.log(`✅ Colaboraciones agregadas para ${artistName}: ${ops.length}`);
    }
  } catch (err) {
    console.warn(`⚠️ Error buscando colaboraciones de ${artistName}:`, err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/graph/related-artists
//  Artistas relacionados al historial del usuario usando BFS en el grafo
// ─────────────────────────────────────────────────────────────────────────────
exports.getRelatedArtists = async (req, res) => {
  try {
    const now    = new Date();
    const userId = req.userId;

    // 1. Artistas que escuchó el usuario este mes (top 10 por playCount)
    const history = await PlayHistory.find({
      userId,
      month: now.getMonth(),
      year:  now.getFullYear(),
    })
      .sort({ playCount: -1 })
      .limit(10)
      .select('artistId artistName');

    if (history.length === 0) {
      return res.status(200).json({ success: true, artists: [], message: 'Sin historial aún' });
    }

    const listenedIds = new Set(history.map(h => h.artistId));

    // 2. Obtener aristas del grafo relacionadas con esos artistas
    const edges = await ArtistGraph.find({
      $or: [
        { artistAId: { $in: [...listenedIds] } },
        { artistBId: { $in: [...listenedIds] } },
      ],
    })
      .sort({ weight: -1 })
      .limit(100);

    // 3. Si hay muy pocas aristas, enriquecer con colaboraciones de Spotify
    if (edges.length < 5) {
      for (const h of history.slice(0, 3)) {
        await addCollaborationsToGraph(h.artistId, h.artistName);
      }
      // Re-consultar tras enriquecer
      const newEdges = await ArtistGraph.find({
        $or: [
          { artistAId: { $in: [...listenedIds] } },
          { artistBId: { $in: [...listenedIds] } },
        ],
      })
        .sort({ weight: -1 })
        .limit(100);
      edges.length = 0;
      edges.push(...newEdges);
    }

    // 4. Construir grafo en memoria
    const graph = new ArtistGraphInMemory();
    for (const h of history) graph.addNode(h.artistId, h.artistName);
    for (const edge of edges) {
      graph.addEdge(
        edge.artistAId, edge.artistAName,
        edge.artistBId, edge.artistBName,
        edge.weight,    edge.connectionType
      );
    }

    // 5. BFS desde cada artista escuchado → acumular vecinos no escuchados
    const related = new Map();
    for (const h of history) {
      const neighbors = graph.getRelated(h.artistId, 2, 10);
      for (const n of neighbors) {
        if (listenedIds.has(n.artistId)) continue;
        if (related.has(n.artistId)) {
          related.get(n.artistId).weight += n.weight;
        } else {
          related.set(n.artistId, { ...n });
        }
      }
    }

    const artists = [...related.values()]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);

    // 6. Enriquecer con imagen de Spotify
    if (artists.length > 0) {
      try {
        const token   = await getSpotifyToken();
        const headers = { Authorization: `Bearer ${token}` };
        const ids     = artists.map(a => a.artistId).join(',');

        const spotifyRes = await axios.get(
          `https://api.spotify.com/v1/artists?ids=${ids}`,
          { headers }
        );

        const artistMap = new Map(
          (spotifyRes.data.artists || []).map(a => [a.id, a])
        );

        for (const artist of artists) {
          const info = artistMap.get(artist.artistId);
          if (info) {
            artist.image      = info.images[0]?.url || null;
            artist.genres     = info.genres          || [];
            artist.popularity = info.popularity       || 0;
          }
        }
      } catch (_) {}
    }

    res.status(200).json({ success: true, artists });

  } catch (error) {
    console.error('❌ Error en getRelatedArtists:', error.message);
    res.status(500).json({ success: false, message: 'Error al obtener artistas relacionados' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/graph/recommended-tracks
//  Canciones recomendadas basadas en colaboraciones del artista actual
// ─────────────────────────────────────────────────────────────────────────────
exports.getRecommendedTracks = async (req, res) => {
  try {
    const { artistId, artistName } = req.query;

    if (!artistId || !artistName) {
      return res.status(400).json({ success: false, message: 'artistId y artistName requeridos' });
    }

    // 1. Buscar colaboraciones en el grafo
    let collabEdges = await ArtistGraph.find({
      $or: [
        { artistAId: artistId, connectionType: 'collaboration' },
        { artistBId: artistId, connectionType: 'collaboration' },
      ],
    })
      .sort({ weight: -1 })
      .limit(5);

    // Si no hay colaboraciones en el grafo, buscarlas en Spotify y guardarlas
    if (collabEdges.length === 0) {
      await addCollaborationsToGraph(artistId, artistName);
      collabEdges = await ArtistGraph.find({
        $or: [
          { artistAId: artistId, connectionType: 'collaboration' },
          { artistBId: artistId, connectionType: 'collaboration' },
        ],
      })
        .sort({ weight: -1 })
        .limit(5);
    }

    if (collabEdges.length === 0) {
      return res.status(200).json({ success: true, tracks: [], message: 'Sin colaboraciones encontradas' });
    }

    // 2. Para cada artista colaborador, buscar sus canciones en Spotify
    const token   = await getSpotifyToken();
    const headers = { Authorization: `Bearer ${token}` };
    const tracks  = [];

    for (const edge of collabEdges.slice(0, 3)) {
      const collabId   = edge.artistAId === artistId ? edge.artistBId   : edge.artistAId;
      const collabName = edge.artistAId === artistId ? edge.artistBName : edge.artistAName;

      try {
        const res2 = await axios.get(
          `https://api.spotify.com/v1/artists/${collabId}/top-tracks`,
          { headers, params: { market: 'US' } }
        );

        const topTracks = (res2.data.tracks || []).slice(0, 3).map(t => ({
          id:           t.id,
          name:         t.name,
          artist:       t.artists.map(a => a.name).join(', '),
          artistId:     t.artists[0]?.id,
          album:        t.album?.name,
          albumImage:   t.album?.images[0]?.url || null,
          duration:     t.duration_ms,
          popularity:   t.popularity,
          reason:       `Colaboró con ${artistName}`,
          reasonArtist: collabName,
        }));

        tracks.push(...topTracks);
        await new Promise(r => setTimeout(r, 100));
      } catch (_) {}
    }

    res.status(200).json({ success: true, tracks: tracks.slice(0, 10) });

  } catch (error) {
    console.error('❌ Error en getRecommendedTracks:', error.message);
    res.status(500).json({ success: false, message: 'Error al obtener canciones recomendadas' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/graph/may-like
//  "Artistas que te pueden gustar" — filtrado colaborativo entre usuarios
// ─────────────────────────────────────────────────────────────────────────────
exports.getMayLike = async (req, res) => {
  try {
    const now    = new Date();
    const userId = req.userId;

    const myHistory = await PlayHistory.find({
      userId,
      month: now.getMonth(),
      year:  now.getFullYear(),
    })
      .sort({ playCount: -1 })
      .limit(10)
      .select('artistId artistName');

    if (myHistory.length === 0) {
      return res.status(200).json({
        success: true,
        artists: [],
        message: 'Escucha más música para obtener recomendaciones',
      });
    }

    const myArtistIds = new Set(myHistory.map(h => h.artistId));

    const edges = await ArtistGraph.find({
      $or: [
        { artistAId: { $in: [...myArtistIds] } },
        { artistBId: { $in: [...myArtistIds] } },
      ],
      'users.1': { $exists: true }, // al menos 2 usuarios
    })
      .sort({ weight: -1 })
      .limit(50);

    const scores = new Map();

    for (const edge of edges) {
      const isA       = myArtistIds.has(edge.artistAId);
      const otherId   = isA ? edge.artistBId   : edge.artistAId;
      const otherName = isA ? edge.artistBName : edge.artistAName;

      if (myArtistIds.has(otherId)) continue;

      const current = scores.get(otherId) || { artistId: otherId, artistName: otherName, score: 0, userCount: 0 };
      current.score     += edge.weight;
      current.userCount += edge.users?.length || 0;
      scores.set(otherId, current);
    }

    const sorted = [...scores.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    if (sorted.length > 0) {
      try {
        const token   = await getSpotifyToken();
        const headers = { Authorization: `Bearer ${token}` };
        const ids     = sorted.map(a => a.artistId).join(',');

        const spotifyRes = await axios.get(
          `https://api.spotify.com/v1/artists?ids=${ids}`,
          { headers }
        );

        const artistMap = new Map(
          (spotifyRes.data.artists || []).map(a => [a.id, a])
        );

        for (const artist of sorted) {
          const info = artistMap.get(artist.artistId);
          if (info) {
            artist.image      = info.images[0]?.url || null;
            artist.genres     = info.genres          || [];
            artist.popularity = info.popularity       || 0;
          }
        }
      } catch (_) {}
    }

    res.status(200).json({ success: true, artists: sorted });

  } catch (error) {
    console.error('❌ Error en getMayLike:', error.message);
    res.status(500).json({ success: false, message: 'Error al obtener recomendaciones' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/graph/recent-tracks
//  Últimas 10 canciones reproducidas para "Seguir escuchando"
// ─────────────────────────────────────────────────────────────────────────────
exports.getRecentTracks = async (req, res) => {
  try {
    const now = new Date();

    const recent = await PlayHistory.find({
      userId: req.userId,
      month:  now.getMonth(),
      year:   now.getFullYear(),
    })
      .sort({ lastPlayedAt: -1 })
      .limit(10)
      .select('trackId trackName artistName artistId albumName albumImage genre playCount lastPlayedAt');

    res.status(200).json({ success: true, tracks: recent });

  } catch (error) {
    console.error('❌ Error en getRecentTracks:', error.message);
    res.status(500).json({ success: false, message: 'Error al obtener canciones recientes' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/graph/data
//  Datos del grafo completo del usuario para la visualización con D3.js
// ─────────────────────────────────────────────────────────────────────────────
exports.getGraphData = async (req, res) => {
  try {
    const now    = new Date();
    const userId = req.userId;

    const history = await PlayHistory.find({
      userId,
      month: now.getMonth(),
      year:  now.getFullYear(),
    })
      .sort({ playCount: -1 })
      .limit(15)
      .select('artistId artistName playCount');

    if (history.length === 0) {
      return res.status(200).json({
        success: true,
        graph:   { nodes: [], edges: [] },
        message: 'Sin historial para mostrar el grafo',
      });
    }

    const listenedIds = history.map(h => h.artistId);

    const edges = await ArtistGraph.find({
      $or: [
        { artistAId: { $in: listenedIds } },
        { artistBId: { $in: listenedIds } },
      ],
    })
      .sort({ weight: -1 })
      .limit(80);

    const graph = new ArtistGraphInMemory();

    for (const h of history) graph.addNode(h.artistId, h.artistName);

    for (const edge of edges) {
      graph.addEdge(
        edge.artistAId, edge.artistAName,
        edge.artistBId, edge.artistBName,
        edge.weight,    edge.connectionType
      );
    }

    const { nodes, edges: graphEdges } = graph.getGraphData();

    const playMap      = new Map(history.map(h => [h.artistId, h.playCount]));
    const enrichedNodes = nodes.map(n => ({
      ...n,
      playCount:  playMap.get(n.id) || 0,
      isListened: playMap.has(n.id),
    }));

    res.status(200).json({
      success: true,
      graph: { nodes: enrichedNodes, edges: graphEdges },
    });

  } catch (error) {
    console.error('❌ Error en getGraphData:', error.message);
    res.status(500).json({ success: false, message: 'Error al obtener datos del grafo' });
  }
};