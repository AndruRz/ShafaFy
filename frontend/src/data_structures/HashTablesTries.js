// ../data_structures/HashTablesTries.js

// ─── Trie Node: cada nodo tiene hijos (Map) y marca de fin de palabra ──────────
class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
  }
}

// ─── Trie: inserción, búsqueda por prefijo y recolección de sugerencias ─────────
class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  /**
   * Inserta una palabra en el trie (normalizada a minúsculas).
   * @param {string} word
   */
  insert(word) {
    if (!word || typeof word !== 'string') return;
    const normalized = word.trim().toLowerCase();
    if (!normalized) return;

    let node = this.root;
    for (const char of normalized) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char);
    }
    node.isEndOfWord = true;
  }

  /**
   * Devuelve el nodo que corresponde al prefijo, o null si no existe.
   * @param {string} prefix
   * @returns {TrieNode|null}
   */
  searchPrefix(prefix) {
    if (!prefix || typeof prefix !== 'string') return null;
    const normalized = prefix.trim().toLowerCase();
    if (!normalized) return this.root;

    let node = this.root;
    for (const char of normalized) {
      if (!node.children.has(char)) return null;
      node = node.children.get(char);
    }
    return node;
  }

  /**
   * Recorre el subárbol desde node y recolecta hasta `limit` palabras que empiezan con currentPrefix.
   * @param {TrieNode} node
   * @param {string} currentPrefix
   * @param {string[]} results
   * @param {number} limit
   */
  _collectSuggestions(node, currentPrefix, results, limit) {
    if (results.length >= limit) return;
    if (node.isEndOfWord) {
      results.push(currentPrefix);
      if (results.length >= limit) return;
    }
    // Ordenar hijos para recorrido consistente (ej. alfabético)
    const sortedChars = [...node.children.keys()].sort();
    for (const char of sortedChars) {
      this._collectSuggestions(
        node.children.get(char),
        currentPrefix + char,
        results,
        limit
      );
      if (results.length >= limit) return;
    }
  }

  /**
   * Obtiene hasta `limit` sugerencias que empiezan con prefix.
   * @param {string} prefix
   * @param {number} limit
   * @returns {string[]}
   */
  getSuggestions(prefix, limit = 5) {
    const node = this.searchPrefix(prefix);
    if (!node) return [];
    const normalizedPrefix = (prefix || '').trim().toLowerCase();
    const results = [];
    this._collectSuggestions(node, normalizedPrefix, results, limit);
    return results;
  }
}

// ─── Hash Table (cache): clave = query normalizado, valor = resultado de búsqueda ─
const searchCache = new Map();
const searchTrie = new Trie();

/**
 * Carga las canciones destacadas (featured).
 * @param {object} spotifyService - servicio de Spotify inyectado
 * @returns {Promise<Array>} lista de tracks
 */
export async function fetchFeaturedTracks(spotifyService) {
  const data = await spotifyService.getFeatured();
  return data;
}

/**
 * Normaliza el query para usar como clave de cache (minúsculas, trim).
 * @param {string} query
 * @returns {string}
 */
function cacheKey(query) {
  return (query || '').trim().toLowerCase();
}

/**
 * Inserta nombres de tracks y artistas en el Trie (sin duplicados por palabra).
 * @param {Array} tracks - lista de { name, artist }
 * @param {Array} artists - lista de { name }
 */
function insertResultsIntoTrie(tracks, artists) {
  const seen = new Set();
  const add = (word) => {
    const w = (word || '').trim();
    if (w && !seen.has(w.toLowerCase())) {
      seen.add(w.toLowerCase());
      searchTrie.insert(w);
    }
  };
  (tracks || []).forEach((t) => {
    add(t.name);
    add(t.artist);
  });
  (artists || []).forEach((a) => add(a.name));
}

/**
 * Busca canciones y artistas según un query.
 * Usa cache (Hash Table): si el query está en cache, devuelve cache. Si no, llama a Spotify,
 * guarda resultados en cache e inserta nombres en el Trie.
 * @param {string} query - texto de búsqueda
 * @param {object} spotifyService - servicio de Spotify inyectado
 * @returns {Promise<{ tracks: Array, topArtist: object|null, searchArtistTracks: Array }>}
 */
export async function searchTracksAndArtists(query, spotifyService) {
  const key = cacheKey(query);
  if (!key) {
    return { tracks: [], topArtist: null, searchArtistTracks: [] };
  }

  // Si está en cache, devolver sin llamar a la API
  const cached = searchCache.get(key);
  if (cached) {
    return cached;
  }

  const [trackResults, artistResults] = await Promise.all([
    spotifyService.search(query),
    spotifyService.searchArtists(query),
  ]);

  // Insertar nombres en el Trie para sugerencias futuras
  insertResultsIntoTrie(trackResults || [], artistResults || []);

  let topArtist = null;
  let searchArtistTracks = [];

  if (artistResults?.length > 0) {
    const top = artistResults[0];
    const nameMatch =
      top.name.toLowerCase().includes(query.toLowerCase()) ||
      query.toLowerCase().includes(top.name.toLowerCase().split(' ')[0]);

    if (nameMatch) {
      topArtist = top;
      const aLow = top.name.toLowerCase();
      const filtered = (trackResults || []).filter(t =>
        t.artist.toLowerCase().includes(aLow) ||
        aLow.includes((t.artist || '').toLowerCase().split(',')[0].trim())
      );
      searchArtistTracks = filtered.length > 0 ? filtered : (trackResults || []);
    }
  }

  const result = {
    tracks: trackResults || [],
    topArtist,
    searchArtistTracks,
  };

  searchCache.set(key, result);
  return result;
}

/**
 * Devuelve hasta 5 sugerencias de autocompletado para el prefijo dado.
 * @param {string} prefix - texto escrito por el usuario
 * @returns {string[]}
 */
export function getSuggestions(prefix) {
  if (!prefix || typeof prefix !== 'string') return [];
  return searchTrie.getSuggestions(prefix, 5);
}
