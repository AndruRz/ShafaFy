// ../data_structures/HashTablesTries.js

// ─────────────────────────────────────────────────────────────────────────────
//  TRIE NODE
// ─────────────────────────────────────────────────────────────────────────────
class TrieNode {
  constructor() {
    this.children    = new Map();
    this.isEndOfWord = false;
    this.frequency   = 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  TRIE — con frecuencia para rankear sugerencias
// ─────────────────────────────────────────────────────────────────────────────
class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word, frequency = 1) {
    if (!word || typeof word !== 'string') return;
    const normalized = word.trim().toLowerCase();
    if (!normalized || normalized.length < 2) return;
    let node = this.root;
    for (const char of normalized) {
      if (!node.children.has(char)) node.children.set(char, new TrieNode());
      node = node.children.get(char);
    }
    node.isEndOfWord  = true;
    node.frequency   += frequency;
  }

  boostWord(word) {
    if (!word) return;
    const normalized = word.trim().toLowerCase();
    let node = this.root;
    for (const char of normalized) {
      if (!node.children.has(char)) return;
      node = node.children.get(char);
    }
    if (node.isEndOfWord) node.frequency += 3;
  }

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

  _collectSuggestions(node, currentPrefix, results, limit) {
    if (results.length >= limit) return;
    if (node.isEndOfWord) {
      results.push({ word: currentPrefix, freq: node.frequency });
      if (results.length >= limit) return;
    }
    const sortedChildren = [...node.children.entries()].sort((a, b) => {
      const fa = a[1].isEndOfWord ? a[1].frequency : 0;
      const fb = b[1].isEndOfWord ? b[1].frequency : 0;
      return fb - fa;
    });
    for (const [char, childNode] of sortedChildren) {
      this._collectSuggestions(childNode, currentPrefix + char, results, limit);
      if (results.length >= limit) return;
    }
  }

  getSuggestions(prefix, limit = 6) {
    const node = this.searchPrefix(prefix);
    if (!node) return [];
    const normalizedPrefix = (prefix || '').trim().toLowerCase();
    const raw = [];
    this._collectSuggestions(node, normalizedPrefix, raw, limit * 2);
    return raw.sort((a, b) => b.freq - a.freq).slice(0, limit).map(r => r.word);
  }

  getAllWords() {
    const results = [];
    this._collectSuggestions(this.root, '', results, 5000);
    return results;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  LEVENSHTEIN DISTANCE
// ─────────────────────────────────────────────────────────────────────────────
function levenshtein(a, b) {
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 5) return 99;
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array(lb + 1);
  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[lb];
}

function getThreshold(len) {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 7) return 2;
  return 3;
}

// ─────────────────────────────────────────────────────────────────────────────
//  TRACK STORE — catálogo en memoria de todos los tracks cargados
// ─────────────────────────────────────────────────────────────────────────────
const trackStore = new Map(); // id → track completo

function storeTrack(track) {
  if (track?.id && !trackStore.has(track.id)) trackStore.set(track.id, track);
}

function storeTracksArray(tracks = []) {
  tracks.forEach(storeTrack);
}

// ─────────────────────────────────────────────────────────────────────────────
//  HASH TABLE JERÁRQUICA — el corazón del fix
//
//  El problema anterior:
//    - Buscas "no digas nada"  → se cachea bajo esa clave exacta
//    - Borras hasta "no dig"   → no hay cache → nueva llamada a API → resultados distintos
//    - Inconsistencia visible para el usuario
//
//  La solución — 3 niveles de cache:
//
//  1. searchCache (exacto)
//     Clave = query completo normalizado → resultado completo de la API
//     Se llena en cada búsqueda exitosa
//
//  2. prefixIndex (jerárquico)
//     Clave = cada prefijo del query (1 char, 2 chars, 3 chars...) → Set de queryKeys
//     Permite encontrar qué queries ya cacheados "contienen" el prefijo actual
//     Ej: "no digas nada" indexa los prefijos: "n", "no", "no ", "no d", ..., "no digas nada"
//
//  3. prefixCache (nombres de canciones por primeras 3 letras)
//     Para sugerencias rápidas de autocompletado
//
//  Con esto, cuando el usuario borra letras:
//    "no digas nada" → "no digas" → "no dig" → "no di" → "no d" → "no "
//    En cada paso se busca en prefixIndex si ya hay un resultado cacheado
//    que sea compatible → respuesta instantánea y CONSISTENTE
// ─────────────────────────────────────────────────────────────────────────────
const searchCache  = new Map(); // queryKey → resultado completo
const prefixIndex  = new Map(); // prefijo  → Set<queryKey> (qué queries cubren este prefijo)
const prefixCache  = new Map(); // 3chars   → [tracks]
const fuzzyCache   = new Map(); // query    → sugerencias fuzzy
const searchTrie   = new Trie();
let   trieReady    = false;

// Registra todos los prefijos de un query en el índice jerárquico
function indexQueryPrefixes(queryKey) {
  // Indexar cada prefijo desde 1 char hasta el query completo
  for (let i = 1; i <= queryKey.length; i++) {
    const prefix = queryKey.slice(0, i);
    if (!prefixIndex.has(prefix)) prefixIndex.set(prefix, new Set());
    prefixIndex.get(prefix).add(queryKey);
  }
}

/**
 * Busca en el cache jerárquico si hay algún resultado ya cacheado
 * que sea superconjunto del query actual (o sea, el query actual es un prefijo
 * de algo ya buscado).
 *
 * Si "no digas nada" está cacheado y el usuario escribe "no dig",
 * esta función devuelve el resultado de "no digas nada" filtrado
 * solo a los tracks que contienen "no dig" → consistencia perfecta.
 */
function getFromHierarchicalCache(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  // 1. Cache exacto → respuesta directa
  if (searchCache.has(normalized)) return searchCache.get(normalized);

  // 2. Buscar en el índice de prefijos: ¿hay queries cacheados que empiezan con este query?
  const candidateKeys = prefixIndex.get(normalized);
  if (candidateKeys && candidateKeys.size > 0) {
    // Elegir el query cacheado más corto (más general = mejores resultados)
    const sorted = [...candidateKeys].sort((a, b) => a.length - b.length);
    for (const cachedKey of sorted) {
      const cached = searchCache.get(cachedKey);
      if (!cached) continue;

      // Filtrar tracks que realmente coincidan con el query actual
      const filteredTracks = cached.tracks.filter(t => {
        const name   = (t.name   || '').toLowerCase();
        const artist = (t.artist || '').toLowerCase();
        const album  = (t.album  || '').toLowerCase();
        return (
          name.includes(normalized)   ||
          artist.includes(normalized) ||
          album.includes(normalized)
        );
      });

      // Solo usar si encontramos resultados relevantes
      if (filteredTracks.length > 0) {
        // Recalcular topArtist para el subconjunto filtrado
        const result = {
          tracks:            filteredTracks,
          topArtist:         cached.topArtist,
          searchArtistTracks: cached.searchArtistTracks.filter(t => {
            const name   = (t.name   || '').toLowerCase();
            const artist = (t.artist || '').toLowerCase();
            return name.includes(normalized) || artist.includes(normalized);
          }),
        };
        // Cachear este subquery también para que la próxima vez sea directa
        searchCache.set(normalized, result);
        indexQueryPrefixes(normalized);
        return result;
      }
    }
  }

  // 3. ¿Hay un query cacheado del que este es extensión?
  //    Ej: "no digas" está cacheado y el usuario escribe "no digas nada"
  //    → filtrar el resultado de "no digas" con el query más largo
  for (const [cachedKey, cached] of searchCache.entries()) {
    if (normalized.startsWith(cachedKey) && normalized.length > cachedKey.length) {
      const filteredTracks = cached.tracks.filter(t => {
        const name   = (t.name   || '').toLowerCase();
        const artist = (t.artist || '').toLowerCase();
        const album  = (t.album  || '').toLowerCase();
        return (
          name.includes(normalized)   ||
          artist.includes(normalized) ||
          album.includes(normalized)
        );
      });
      if (filteredTracks.length > 0) {
        const result = {
          tracks:            filteredTracks,
          topArtist:         cached.topArtist,
          searchArtistTracks: cached.searchArtistTracks.filter(t =>
            (t.name || '').toLowerCase().includes(normalized) ||
            (t.artist || '').toLowerCase().includes(normalized)
          ),
        };
        searchCache.set(normalized, result);
        indexQueryPrefixes(normalized);
        return result;
      }
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  SEMILLAS
// ─────────────────────────────────────────────────────────────────────────────
const SEED_TERMS = [
  'reggaeton','pop','rock','trap','rap','salsa','cumbia','bachata',
  'merengue','vallenato','urbano','electronica','jazz','blues','metal',
  'indie','r&b','soul','folk','country','hip hop','dancehall','afrobeat',
  'bad bunny','j balvin','maluma','ozuna','anuel','karol g','rosalia',
  'shakira','daddy yankee','don omar','wisin','yandel','nicky jam',
  'myke towers','rauw alejandro','jhay cortez','sech','mora','jhayco',
  'feid','blessd','ryan castro','young miko','bizarrap','peso pluma',
  'natanael cano','junior h','xavi','eslabon armado','latin mafia',
  'taylor swift','drake','weeknd','billie eilish','ariana grande',
  'ed sheeran','post malone','travis scott','kendrick lamar','sza',
  'doja cat','olivia rodrigo','harry styles','dua lipa','the beatles',
  'eminem','rihanna','beyonce','adele','coldplay','lady gaga',
  'bruno mars','justin bieber','selena gomez','camila cabello',
  'shawn mendes','charlie puth','sam smith','lorde','halsey',
  'remix','acoustic','live','cover','balada','cancion','musica',
  'latin','hits','nuevo','perreo','corridos','tumbados','regional',
  'sessions','bzrp','music','official','video','letra','lyrics',
];

function seedTrie() {
  if (trieReady) return;
  SEED_TERMS.forEach(term => searchTrie.insert(term, 2));
  trieReady = true;
}

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function cacheKey(query) {
  return (query || '').trim().toLowerCase();
}

function insertResultsIntoTrie(tracks, artists) {
  const seen = new Set();
  const add  = (word, freq = 1) => {
    const w = (word || '').trim();
    if (!w) return;
    const key = w.toLowerCase();
    if (!seen.has(key)) { seen.add(key); searchTrie.insert(w, freq); }
  };
  (tracks  || []).forEach(t => { add(t.name, 3); add(t.artist, 2); add(t.album, 1); storeTrack(t); });
  (artists || []).forEach(a => add(a.name, 4));

  (tracks || []).forEach(t => {
    if (!t.name) return;
    const p3 = t.name.trim().toLowerCase().slice(0, 3);
    if (!prefixCache.has(p3)) prefixCache.set(p3, []);
    const list = prefixCache.get(p3);
    if (!list.find(x => x.id === t.id)) list.push(t);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  FUZZY SEARCH
// ─────────────────────────────────────────────────────────────────────────────
function fuzzySearchTrie(query, limit = 5) {
  const normalized = query.trim().toLowerCase();
  const threshold  = getThreshold(normalized.length);
  const fKey       = `trie:${normalized}`;
  if (fuzzyCache.has(fKey)) return fuzzyCache.get(fKey);

  const exactSuggestions = searchTrie.getSuggestions(normalized, limit);
  if (exactSuggestions.length >= 2) { fuzzyCache.set(fKey, exactSuggestions); return exactSuggestions; }

  const allWords   = searchTrie.getAllWords();
  const candidates = [];
  for (const { word, freq } of allWords) {
    const tokens = word.split(' ');
    let minDist  = levenshtein(normalized, word);
    for (const token of tokens) { const d = levenshtein(normalized, token); if (d < minDist) minDist = d; }
    if (word.startsWith(normalized)) minDist = 0;
    if (minDist <= threshold) candidates.push({ word, freq, dist: minDist });
  }

  const results = candidates.sort((a, b) => a.dist - b.dist || b.freq - a.freq).slice(0, limit).map(c => c.word);
  fuzzyCache.set(fKey, results);
  return results;
}

function fuzzySearchTracks(query, limit = 20) {
  const normalized = query.trim().toLowerCase();
  const threshold  = getThreshold(normalized.length);
  const candidates = [];

  for (const track of trackStore.values()) {
    const name   = (track.name   || '').toLowerCase();
    const artist = (track.artist || '').toLowerCase();
    const album  = (track.album  || '').toLowerCase();

    let minDist = Math.min(levenshtein(normalized, name), levenshtein(normalized, artist), levenshtein(normalized, album));

    const allTokens = [...name.split(' '), ...artist.split(' '), ...album.split(' ')];
    for (const token of allTokens) {
      if (token.length < 2) continue;
      const d = levenshtein(normalized, token);
      if (d < minDist) minDist = d;
    }

    if (name.includes(normalized) || artist.includes(normalized)) minDist = 0;
    if (allTokens.some(t => t.startsWith(normalized))) minDist = Math.min(minDist, 0);

    if (minDist <= threshold) candidates.push({ track, dist: minDist });
  }

  return candidates.sort((a, b) => a.dist - b.dist).slice(0, limit).map(c => c.track);
}

function getCorrectedQuery(query) {
  const normalized = query.trim().toLowerCase();
  if (normalized.length <= 2) return normalized;
  const exactNode = searchTrie.searchPrefix(normalized);
  if (exactNode) return normalized;
  const fuzzyResults = fuzzySearchTrie(normalized, 3);
  if (fuzzyResults.length === 0) return normalized;
  const best      = fuzzyResults[0];
  const dist      = levenshtein(normalized, best);
  const threshold = getThreshold(normalized.length);
  if (dist <= threshold && Math.abs(best.length - normalized.length) <= 3) return best;
  return normalized;
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchFeaturedTracks(spotifyService) {
  const data = await spotifyService.getFeatured();
  seedTrie();
  if (data?.length > 0) {
    insertResultsIntoTrie(data, []);
    storeTracksArray(data);
  }
  return data;
}

/**
 * Busca canciones y artistas.
 *
 * Flujo mejorado:
 *  1. Normaliza el query
 *  2. Busca en el cache jerárquico — si el usuario borró letras de una búsqueda
 *     anterior, devuelve resultado filtrado instantáneamente SIN ir a la API
 *  3. Si no hay cache → corrige typos (fuzzy) → llama a la API
 *  4. Guarda en cache + indexa todos los prefijos del query
 */
export async function searchTracksAndArtists(query, spotifyService) {
  const rawKey = cacheKey(query);
  if (!rawKey) return { tracks: [], topArtist: null, searchArtistTracks: [] };

  // ── Cache jerárquico — cubre tanto exacto como subqueries/superqueries ──
  const hierarchical = getFromHierarchicalCache(rawKey);
  if (hierarchical) {
    searchTrie.boostWord(rawKey);
    return hierarchical;
  }

  // ── Corrección de typo ──
  const corrected = getCorrectedQuery(rawKey);
  const key       = corrected || rawKey;

  // Verificar cache también con la versión corregida
  if (key !== rawKey) {
    const correctedCache = getFromHierarchicalCache(key);
    if (correctedCache) {
      searchTrie.boostWord(key);
      // Guardar bajo el key original también
      searchCache.set(rawKey, correctedCache);
      indexQueryPrefixes(rawKey);
      return correctedCache;
    }
  }

  // ── Fuzzy local sobre trackStore (resultados instantáneos mientras carga la API) ──
  const localFuzzyTracks = fuzzySearchTracks(rawKey, 10);

  // ── Llamada a la API ──
  const [trackResults, artistResults] = await Promise.all([
    spotifyService.search(key),
    spotifyService.searchArtists(key),
  ]);

  // Combinar resultados de la API con los locales (sin duplicados)
  const apiIds   = new Set((trackResults || []).map(t => t.id));
  const combined = [
    ...(trackResults || []),
    ...localFuzzyTracks.filter(t => !apiIds.has(t.id)),
  ];

  insertResultsIntoTrie(combined, artistResults || []);
  storeTracksArray(combined);
  searchTrie.boostWord(key);

  let topArtist          = null;
  let searchArtistTracks = [];

  if (artistResults?.length > 0) {
    const top       = artistResults[0];
    const nameMatch =
      top.name.toLowerCase().includes(key) ||
      key.includes(top.name.toLowerCase().split(' ')[0]);

    if (nameMatch) {
      topArtist = top;
      const aLow     = top.name.toLowerCase();
      const filtered = combined.filter(t =>
        t.artist.toLowerCase().includes(aLow) ||
        aLow.includes((t.artist || '').toLowerCase().split(',')[0].trim())
      );
      searchArtistTracks = filtered.length > 0 ? filtered : combined;
    }
  }

  const result = { tracks: combined, topArtist, searchArtistTracks };

  // Guardar en cache e indexar prefijos para búsquedas futuras
  searchCache.set(key, result);
  indexQueryPrefixes(key);

  // Guardar también bajo el key original si fue corregido
  if (key !== rawKey) {
    searchCache.set(rawKey, result);
    indexQueryPrefixes(rawKey);
  }

  return result;
}

/**
 * Sugerencias de autocompletado con fuzzy fallback para canciones y artistas.
 */
export function getSuggestions(prefix) {
  if (!prefix || typeof prefix !== 'string' || prefix.trim().length === 0) return [];
  const normalized = prefix.trim().toLowerCase();

  const exactSuggestions = searchTrie.getSuggestions(normalized, 6);

  let cacheSuggestions = [];
  if (normalized.length >= 3) {
    const p3     = normalized.slice(0, 3);
    const cached = prefixCache.get(p3) || [];
    cacheSuggestions = cached
      .filter(t => t.name.toLowerCase().startsWith(normalized))
      .map(t => t.name.toLowerCase())
      .slice(0, 3);
  }

  const combined = [...new Set([...exactSuggestions, ...cacheSuggestions])];
  if (combined.length >= 3) return combined.slice(0, 6);

  const fuzzyTrie   = fuzzySearchTrie(normalized, 3);
  const fuzzyTracks = normalized.length >= 3
    ? fuzzySearchTracks(normalized, 3).map(t => t.name.toLowerCase())
    : [];

  return [...new Set([...combined, ...fuzzyTrie, ...fuzzyTracks])].slice(0, 6);
}

/**
 * Limpia los caches al cerrar sesión.
 * trackStore se mantiene (datos públicos, mejoran el fuzzy en la próxima sesión).
 */
export function clearCaches() {
  searchCache.clear();
  prefixIndex.clear();
  prefixCache.clear();
  fuzzyCache.clear();
}