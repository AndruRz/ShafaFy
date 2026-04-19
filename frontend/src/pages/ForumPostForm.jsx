import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import authService from '../services/authService';
import forumService from '../services/forumService';
import './css/Forum.css';

function ForumPostForm() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(postId);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await forumService.getPost(postId);
        const me = authService.getUser()?.id;
        if (data.post?.author?.id !== me) {
          navigate('/foro', { replace: true });
          return;
        }
        if (!cancelled) {
          setTitle(data.post.title);
          setContent(data.post.content);
        }
      } catch {
        if (!cancelled) setError('No se pudo cargar la publicación.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isEdit, postId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const t = title.trim();
    const c = content.trim();
    if (!t || !c) return;
    try {
      setSaving(true);
      setError('');
      if (isEdit) {
        await forumService.updatePost(postId, { title: t, content: c });
        navigate(`/foro/post/${postId}`);
      } else {
        const data = await forumService.createPost({ title: t, content: c });
        const id = data.post?.id;
        if (id) navigate(`/foro/post/${id}`);
        else navigate('/foro');
      }
    } catch (error) {
      const raw = error?.response?.data?.message ?? error?.message;
      const msg = typeof raw === 'string' ? raw : 'No se pudo guardar.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="forum-page">
        <div className="forum-loading forum-loading--center">
          <div className="forum-spinner" />
          <p className="forum-muted">Cargando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="forum-page">
      <header className="forum-header">
        <div className="forum-header-row">
          <button type="button" className="forum-back-btn" onClick={() => navigate(isEdit ? `/foro/post/${postId}` : '/foro')}>
            ← Cancelar
          </button>
        </div>
      </header>

      <main className="forum-main forum-main--narrow">
        <h1 className="forum-title">{isEdit ? 'Editar publicación' : 'Nueva publicación'}</h1>

        {error && <div className="forum-alert forum-alert--error">{error}</div>}

        <form className="forum-form" onSubmit={handleSubmit}>
          <label htmlFor="forum-title" className="forum-label">Título</label>
          <input
            id="forum-title"
            className="forum-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
          />

          <label htmlFor="forum-content" className="forum-label">Contenido</label>
          <textarea
            id="forum-content"
            className="forum-textarea"
            rows={12}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />

          <div className="forum-form-actions">
            <button type="submit" className="btn-musica" disabled={saving}>
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Publicar'}
            </button>
            <Link to={isEdit ? `/foro/post/${postId}` : '/foro'} className="forum-link-btn">
              Volver
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

export default ForumPostForm;
