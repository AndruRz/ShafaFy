import { memo, useState, useCallback } from 'react';

/**
 * Renderizado recursivo del árbol de comentarios.
 * Cada nodo incluye `replies`: hijos en profundidad arbitraria (estructura de árbol n-ario).
 */
const CommentNode = memo(function CommentNode({
  node,
  depth,
  currentUserId,
  onReply,
  onDelete,
  busyId,
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const isOwner = currentUserId && node.author?.id === currentUserId;
  const padding = Math.min(depth, 12) * 14;

  const submitReply = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !onReply) return;
    await onReply(node.id, text);
    setDraft('');
    setReplyOpen(false);
  };

  const handleDelete = () => {
    if (!window.confirm('¿Eliminar este comentario y todas sus respuestas?')) return;
    onDelete(node.id);
  };

  return (
    <div className="forum-comment-node" style={{ marginLeft: depth > 0 ? `${padding}px` : 0 }}>
      <div className="forum-comment-card">
        <div className="forum-comment-meta">
          <span className="forum-comment-author">{node.author?.fullName || node.author?.username || 'Usuario'}</span>
          <span className="forum-comment-date">
            {node.createdAt
              ? new Date(node.createdAt).toLocaleString('es-ES', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })
              : ''}
          </span>
        </div>
        <p className="forum-comment-body">{node.content}</p>
        <div className="forum-comment-actions">
          <button type="button" className="forum-link-btn" onClick={() => setReplyOpen((v) => !v)}>
            Responder
          </button>
          {isOwner && (
            <button
              type="button"
              className="forum-link-btn forum-link-btn--danger"
              onClick={handleDelete}
              disabled={busyId === node.id}
            >
              {busyId === node.id ? 'Eliminando…' : 'Eliminar'}
            </button>
          )}
        </div>
        {replyOpen && (
          <form className="forum-reply-form" onSubmit={submitReply}>
            <textarea
              className="forum-textarea forum-textarea--sm"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribe una respuesta…"
              rows={3}
            />
            <div className="forum-reply-form-actions">
              <button type="submit" className="btn-musica forum-btn-inline" disabled={!draft.trim()}>
                Publicar respuesta
              </button>
              <button type="button" className="forum-link-btn" onClick={() => { setReplyOpen(false); setDraft(''); }}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
      {node.replies?.length > 0 && (
        <div className="forum-comment-children">
          {node.replies.map((child) => (
            <CommentNode
              key={child.id}
              node={child}
              depth={depth + 1}
              currentUserId={currentUserId}
              onReply={onReply}
              onDelete={onDelete}
              busyId={busyId}
            />
          ))}
        </div>
      )}
    </div>
  );
});

function CommentThread({ comments, currentUserId, onReply, onDelete, busyId }) {
  const stableReply = useCallback(
    (parentCommentId, text) => onReply(parentCommentId, text),
    [onReply]
  );

  if (!comments?.length) {
    return <p className="forum-muted">Sé el primero en comentar.</p>;
  }

  return (
    <div className="forum-comment-thread">
      {comments.map((node) => (
        <CommentNode
          key={node.id}
          node={node}
          depth={0}
          currentUserId={currentUserId}
          onReply={stableReply}
          onDelete={onDelete}
          busyId={busyId}
        />
      ))}
    </div>
  );
}

export default memo(CommentThread);
