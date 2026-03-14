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
 *  COLA (Queue) — Cola de reproducción con contexto activo
 * ─────────────────────────────────────────────────────────────
 *  Maneja múltiples listas de canciones (búsqueda, artista,
 *  favoritos, perfil de usuario) sin que se mezclen entre sí.
 *
 *  El problema raíz: antes no había forma de saber *de dónde*
 *  venía la canción actual. Al cargar una nueva lista se pisaba
 *  la cola anterior, causando que next/prev saltara a canciones
 *  de otra vista.
 *
 *  Solución: cada lista tiene un "contexto" con nombre único.
 *  loadTracks() solo acepta la lista si viene del contexto activo.
 *  Si cambias de vista, primero llamas setContext() y la pila de
 *  historial se limpia automáticamente.
 *
 *  Contextos disponibles:
 *    'search'   → resultados de búsqueda / canciones destacadas
 *    'artist'   → perfil de artista
 *    'favorites'→ Mis Canciones (favoritos)
 *    'profile'  → perfil de usuario (top tracks del mes)
 *
 *  Uso en Reproductor:
 *    - setContext('artist', historyStack)   → al abrir perfil artista
 *    - loadTracks(tracks, 'artist')         → al recibir las canciones
 *    - getNext(currentId)                   → botón siguiente
 *    - getPrev(currentId)                   → botón anterior (fallback circular)
 * ─────────────────────────────────────────────────────────────
 */
export class PlayQueue {
  constructor() {
    this._queue       = [];
    this._context     = 'search'; // contexto activo actual
  }

  /**
   * Cambia el contexto activo y limpia el historial.
   * Llamar ANTES de cargar una nueva lista de canciones.
   * @param {'search'|'artist'|'favorites'|'profile'} context
   * @param {HistoryStack} historyStack - referencia a la pila para limpiarla
   */
  setContext(context, historyStack) {
    if (this._context === context) return; // ya estaba en ese contexto, no hacer nada
    this._context = context;
    this._queue   = [];
    if (historyStack) historyStack.clear();
  }

  /**
   * Carga una lista de canciones SOLO si el contexto coincide con el activo.
   * Así evitamos que una lista de favoritos pise la cola de búsqueda.
   * @param {Array}  tracks
   * @param {'search'|'artist'|'favorites'|'profile'} context
   */
  loadTracks(tracks = [], context) {
    if (context && context !== this._context) return; // contexto incorrecto → ignorar
    this._queue = [...tracks];
  }

  /** Retorna el contexto activo actual */
  getContext() {
    return this._context;
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