/**
 * ─────────────────────────────────────────────────────────────
 *  PILA (Stack) — Historial de reproducción
 * ─────────────────────────────────────────────────────────────
 *  Permite retroceder a canciones anteriores.
 *  Comportamiento LIFO: la última canción agregada es la primera en salir.
 *
 *  Uso en Reproductor:
 *    - push(track)  → cada vez que avanzas o reproduces una canción nueva
 *    - pop()        → cuando presionas "anterior" para volver a la canción previa real
 * ─────────────────────────────────────────────────────────────
 */
export class HistoryStack {
  constructor() {
    this._stack = [];
  }

  /** Agrega una canción al historial */
  push(track) {
    if (!track) return;
    this._stack.push(track);
  }

  /** Saca y retorna la canción más reciente del historial */
  pop() {
    return this._stack.pop() || null;
  }

  /** Ver cuál sería la anterior sin sacarla */
  peek() {
    return this._stack[this._stack.length - 1] || null;
  }

  isEmpty() {
    return this._stack.length === 0;
  }

  size() {
    return this._stack.length;
  }

  clear() {
    this._stack = [];
  }
}


/**
 * ─────────────────────────────────────────────────────────────
 *  COLA (Queue) — Cola de reproducción
 * ─────────────────────────────────────────────────────────────
 *  Permite avanzar por una lista de canciones en orden.
 *  Comportamiento FIFO circular: cuando llega al final vuelve al inicio.
 *
 *  Uso en Reproductor:
 *    - loadTracks(tracks) → cuando se carga una nueva lista (búsqueda, artista, favoritos, etc.)
 *    - getNext(currentId) → cuando presionas "siguiente" o la canción termina sola
 *    - getPrev(currentId) → fallback circular cuando no hay historial
 * ─────────────────────────────────────────────────────────────
 */
export class PlayQueue {
  constructor() {
    this._queue = [];
  }

  /** Carga una lista completa de canciones en la cola */
  loadTracks(tracks = []) {
    this._queue = [...tracks];
  }

  /** Retorna el índice del siguiente track dado el id actual */
  getNextIndex(currentId) {
    if (this._queue.length === 0) return -1;
    const idx = this._queue.findIndex(t => t.id === currentId);
    if (idx === -1) return 0;
    return (idx + 1) % this._queue.length;
  }

  /** Retorna el índice del track anterior dado el id actual */
  getPrevIndex(currentId) {
    if (this._queue.length === 0) return -1;
    const idx = this._queue.findIndex(t => t.id === currentId);
    if (idx === -1) return 0;
    return (idx - 1 + this._queue.length) % this._queue.length;
  }

  /** Retorna el track siguiente */
  getNext(currentId) {
    const i = this.getNextIndex(currentId);
    return i >= 0 ? this._queue[i] : null;
  }

  /** Retorna el track anterior (circular) */
  getPrev(currentId) {
    const i = this.getPrevIndex(currentId);
    return i >= 0 ? this._queue[i] : null;
  }

  /** Retorna toda la lista cargada */
  getTracks() {
    return this._queue;
  }

  isEmpty() {
    return this._queue.length === 0;
  }

  size() {
    return this._queue.length;
  }

  clear() {
    this._queue = [];
  }
}