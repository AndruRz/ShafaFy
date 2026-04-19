/**
 * Utilidades para fusionar comentarios en el árbol sin recargar desde el servidor.
 */

export function ordenarPorFechaCreacion(nodos) {
  return [...nodos].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export function comentarioExisteEnArbol(nodos, id) {
  if (!nodos?.length || !id) return false;
  for (const n of nodos) {
    if (n.id === id) return true;
    if (n.replies?.length && comentarioExisteEnArbol(n.replies, id)) return true;
  }
  return false;
}

/**
 * Inserta un nodo hoja en la posición correcta según parentCommentId (null = raíz del post).
 */
export function insertarComentarioEnArbol(arbol, nuevoNodo, parentCommentId) {
  const nodo = {
    ...nuevoNodo,
    replies: nuevoNodo.replies?.length ? nuevoNodo.replies : [],
  };

  if (!parentCommentId) {
    return ordenarPorFechaCreacion([...arbol, nodo]);
  }

  const insertarEnNivel = (nodos) =>
    nodos.map((n) => {
      if (n.id === parentCommentId) {
        return {
          ...n,
          replies: ordenarPorFechaCreacion([...(n.replies || []), nodo]),
        };
      }
      if (n.replies?.length) {
        return { ...n, replies: insertarEnNivel(n.replies) };
      }
      return n;
    });

  return insertarEnNivel(arbol);
}

export function publicacionCoincideBusqueda(publicacion, consulta) {
  const q = (consulta || '').trim().toLowerCase();
  if (!q) return true;
  const titulo = (publicacion.title || '').toLowerCase();
  const contenido = (publicacion.content || '').toLowerCase();
  return titulo.includes(q) || contenido.includes(q);
}
