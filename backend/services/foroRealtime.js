const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

/** Sala donde reciben actualizaciones quienes ven el listado del foro */
const SALA_LISTA_FORO = 'foro:lista';

/** Sala por publicación: evita enviar comentarios a quien no está viendo ese post */
function salaPublicacion(postId) {
  return `foro:post:${postId}`;
}

let ioRef = null;

/**
 * Inicializa autenticación JWT en el handshake y las salas del foro.
 */
function inicializar(io) {
  ioRef = io;

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('No autorizado'));
      }
      const decodificado = jwt.verify(token, process.env.JWT_SECRET);
      socket.usuarioId = decodificado.id;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('unirse_lista_foro', () => {
      socket.join(SALA_LISTA_FORO);
    });

    socket.on('salir_lista_foro', () => {
      socket.leave(SALA_LISTA_FORO);
    });

    socket.on('unirse_publicacion', (postId) => {
      if (!postId || !mongoose.Types.ObjectId.isValid(postId)) return;
      socket.join(salaPublicacion(postId));
    });

    socket.on('salir_publicacion', (postId) => {
      if (!postId) return;
      socket.leave(salaPublicacion(postId));
    });
  });
}

function emitirPostCreado(payload) {
  ioRef?.to(SALA_LISTA_FORO).emit('post_creado', payload);
}

function emitirPostActualizado(payload) {
  const id = payload?.post?.id;
  ioRef?.to(SALA_LISTA_FORO).emit('post_actualizado', payload);
  if (id) {
    ioRef?.to(salaPublicacion(id)).emit('post_actualizado', payload);
  }
}

function emitirPostEliminado(payload) {
  const { postId } = payload;
  ioRef?.to(SALA_LISTA_FORO).emit('post_eliminado', payload);
  if (postId) {
    ioRef?.to(salaPublicacion(postId)).emit('post_eliminado', payload);
  }
}

/**
 * Nuevo comentario o respuesta: sala del post (detalle) + sala del listado (solo actualiza contadores allí).
 */
function emitirComentarioCreado(postId, payload) {
  if (!postId) return;
  ioRef?.to(salaPublicacion(postId)).emit('comentario_creado', payload);
  ioRef?.to(SALA_LISTA_FORO).emit('comentario_creado', payload);
}

module.exports = {
  inicializar,
  emitirPostCreado,
  emitirPostActualizado,
  emitirPostEliminado,
  emitirComentarioCreado,
  SALA_LISTA_FORO,
  salaPublicacion,
};
