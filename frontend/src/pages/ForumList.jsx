import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import forumService from '../services/forumService';
import { obtenerClienteSocketForo } from '../services/foroSocket';
import { publicacionCoincideBusqueda } from '../utils/foroArbol';
import './css/Forum.css';

function ForumList() {
  const navigate = useNavigate();
  const user = authService.getUser();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  const idsComentariosProcesados = useRef(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 320);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await forumService.listPosts(debounced);
      setPosts(data.posts || []);
      idsComentariosProcesados.current.clear();
    } catch {
      setError('No se pudieron cargar las publicaciones.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [debounced]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = obtenerClienteSocketForo();

    const unirseLista = () => socket.emit('unirse_lista_foro');
    socket.on('connect', unirseLista);
    unirseLista();

    const onPostCreado = ({ post }) => {
      if (!post?.id) return;
      setPosts((prev) => {
        if (prev.some((p) => p.id === post.id)) return prev;
        if (!publicacionCoincideBusqueda(post, debounced)) return prev;
        return [post, ...prev];
      });
    };

    const onPostActualizado = ({ post }) => {
      if (!post?.id) return;
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, ...post } : p))
      );
    };

    const onPostEliminado = ({ postId }) => {
      if (!postId) return;
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    };

    const onComentarioCreado = ({ postId, comment }) => {
      if (!postId || !comment?.id) return;
      if (idsComentariosProcesados.current.has(comment.id)) return;
      idsComentariosProcesados.current.add(comment.id);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, commentCount: (p.commentCount ?? 0) + 1 }
            : p
        )
      );
    };

    socket.on('post_creado', onPostCreado);
    socket.on('post_actualizado', onPostActualizado);
    socket.on('post_eliminado', onPostEliminado);
    socket.on('comentario_creado', onComentarioCreado);

    return () => {
      socket.off('connect', unirseLista);
      socket.off('post_creado', onPostCreado);
      socket.off('post_actualizado', onPostActualizado);
      socket.off('post_eliminado', onPostEliminado);
      socket.off('comentario_creado', onComentarioCreado);
      socket.emit('salir_lista_foro');
    };
  }, [debounced]);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/auth');
  };

  return (
    <div className="forum-page">
      <header className="forum-header">
        <div className="forum-header-row">
          <button type="button" className="forum-back-btn" onClick={() => navigate('/reproductor')}>
            ← Reproductor
          </button>
          <span className="forum-logo">
            Shafa<span className="logo-accent">Fy</span> · Comunidad
          </span>
          <div className="forum-header-user">
            <span className="forum-user-name">{user?.username}</span>
            <button type="button" className="logout-btn forum-logout" onClick={handleLogout}>
              Salir
            </button>
          </div>
        </div>

        <div className="forum-toolbar">
          <div className="forum-search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              className="forum-search"
              placeholder="Buscar en títulos y contenido…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Link to="/foro/nuevo" className="btn-musica forum-new-post">
            Nueva publicación
          </Link>
        </div>
      </header>

      <main className="forum-main">
        <h1 className="forum-title">Foro</h1>
        <p className="forum-subtitle">
          Publicaciones y comentarios en hilos anidados (estructura de árbol). Actualizaciones en tiempo real.
        </p>

        {error && (
          <div className="forum-alert forum-alert--error">{error}</div>
        )}

        {loading ? (
          <div className="forum-loading">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="forum-post-skeleton" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="forum-muted">No hay publicaciones todavía. ¡Crea la primera!</p>
        ) : (
          <ul className="forum-post-list">
            {posts.map((p) => (
              <li key={p.id}>
                <Link to={`/foro/post/${p.id}`} className="forum-post-preview">
                  <h2 className="forum-post-preview-title">{p.title}</h2>
                  <p className="forum-post-preview-excerpt">
                    {p.content.length > 160 ? `${p.content.slice(0, 157)}…` : p.content}
                  </p>
                  <div className="forum-post-preview-meta">
                    <span>{p.author?.username || 'Usuario'}</span>
                    <span>
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
                        : ''}
                    </span>
                    <span>{p.commentCount ?? 0} comentarios</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default ForumList;
