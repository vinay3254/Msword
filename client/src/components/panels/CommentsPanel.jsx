import { useState, useEffect } from 'react';
import { getComments, addComment, updateComment, deleteComment, addReply } from '../../api/comments';

function relTime(dateStr) {
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = (now - d) / 60000;
  if (diff < 1)   return 'Just now';
  if (diff < 60)  return `${Math.floor(diff)}m ago`;
  if (diff < 1440)return `${Math.floor(diff / 60)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// TODO: replace anchorId DOM approach with character offset anchoring
// to make comments undo-safe. Current approach is fragile by design.
export default function CommentsPanel({ docId, editorRef, user, collaborators: collaboratorsProp = [], orphanedCommentIds = [], onCommentsChange, onReanchor, onClose }) {
  const [comments,  setComments]  = useState([]);
  const [filter,    setFilter]    = useState('all'); // all | open | resolved
  const [newText,   setNewText]   = useState('');
  const [newAnchor, setNewAnchor] = useState('');
  const [adding,    setAdding]    = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [replyText, setReplyText] = useState({});
  const [showMentions, setShowMentions] = useState(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [collaborators, setCollaborators] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await getComments(docId);
        setComments(data);
        if (collaboratorsProp?.length > 0) {
          setCollaborators(collaboratorsProp);
        } else {
          const authors = [...new Map(
            data.filter(c => c.author).map(c => [c.author._id, c.author])
          ).values()];
          setCollaborators(authors);
        }
      } catch (err) {
        console.error('Failed to load comments', err);
        setError('Failed to load comments');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [docId]);

  useEffect(() => {
    if (collaboratorsProp?.length > 0) {
      setCollaborators(collaboratorsProp);
    }
  }, [collaboratorsProp]);

  useEffect(() => {
    onCommentsChange?.(comments);
  }, [comments, onCommentsChange]);

  // Start adding a comment: wraps selected text in an anchor span
  const startAddComment = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { setError('Select text in the document to add a comment.'); return; }
    const id  = `comment-${Date.now()}`;
    const range = sel.getRangeAt(0);
    const span  = document.createElement('span');
    span.className = 'comment-anchor';
    span.setAttribute('data-comment-id', id);
    span.style.backgroundColor = '#fef9c3';
    try {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
    } catch {
      setError('Cannot comment on this selection. Adjust selection and try again.');
      return;
    }
    sel.removeAllRanges();
    setNewAnchor(id);
    setAdding(true);
    setError('');
  };

  const cancelAdd = () => {
    // Remove anchor span if user cancels
    if (newAnchor && editorRef.current) {
      const span = editorRef.current.querySelector(`[data-comment-id="${newAnchor}"]`);
      if (span) span.replaceWith(...span.childNodes);
    }
    setAdding(false);
    setNewAnchor('');
    setNewText('');
  };

  const submitComment = async () => {
    if (!newText.trim() || !newAnchor) return;
    try {
      const { data } = await addComment(docId, newAnchor, newText.trim());
      setComments(prev => [...prev, data]);
      setAdding(false);
      setNewAnchor('');
      setNewText('');
    } catch { setError('Failed to add comment'); }
  };

  const handleResolve = async (c) => {
    try {
      const { data } = await updateComment(docId, c._id, { resolved: !c.resolved });
      setComments(prev => prev.map(x => x._id === c._id ? data : x));
      if (data.resolved && editorRef.current) {
        const span = editorRef.current.querySelector(`[data-comment-id="${c.anchorId}"]`);
        if (span) span.style.opacity = '0.4';
      }
    } catch { setError('Failed to update comment'); }
  };

  const handleDelete = async (c) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteComment(docId, c._id);
      setComments(prev => prev.filter(x => x._id !== c._id));
      if (editorRef.current) {
        const span = editorRef.current.querySelector(`[data-comment-id="${c.anchorId}"]`);
        if (span) span.replaceWith(...span.childNodes);
      }
    } catch { setError('Failed to delete comment'); }
  };

  const handleReanchor = async (c) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setError('Select text in the document, then click Re-anchor.');
      return;
    }

    const nextAnchorId = `comment-${Date.now()}`;
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.className = 'comment-anchor';
    span.setAttribute('data-comment-id', nextAnchorId);
    span.style.backgroundColor = '#fef9c3';

    try {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
      sel.removeAllRanges();
    } catch {
      setError('Could not re-anchor selection. Try selecting a simpler range.');
      return;
    }

    try {
      const { data } = await updateComment(docId, c._id, { anchorId: nextAnchorId });
      setComments(prev => prev.map(x => (x._id === c._id ? data : x)));
      onReanchor?.(c._id, nextAnchorId);
    } catch {
      setError('Failed to update comment anchor');
    }
  };

  const focusComment = (anchorId) => {
    const el = editorRef.current?.querySelector(`[data-comment-id="${anchorId}"]`);
    if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('comment-active'); setTimeout(() => el.classList.remove('comment-active'), 1500); }
  };

  const renderMentions = (text = '') => {
    const parts = text.split(/(@[\w.-]+)/g);
    return parts.map((part, idx) => (
      /^@[\w.-]+$/.test(part)
        ? <span key={`${part}-${idx}`} className="mention">{part}</span>
        : <span key={`${part}-${idx}`}>{part}</span>
    ));
  };

  const submitReply = async (commentId) => {
    const text = String(replyText[commentId] || '').trim();
    if (!text) return;
    try {
      const { data } = await addReply(commentId, text);
      setComments(prev => prev.map(c => (c._id === commentId ? data : c)));
      setReplyText(prev => ({ ...prev, [commentId]: '' }));
      setShowMentions(null);
      setMentionQuery('');
    } catch {
      setError('Failed to add reply');
    }
  };

  const insertMention = (commentId, userObj) => {
    const current = replyText[commentId] || '';
    const parts = current.split('@');
    parts[parts.length - 1] = `${String(userObj.name || '').replace(/\s+/g, '')} `;
    const next = parts.join('@');
    setReplyText(prev => ({ ...prev, [commentId]: next }));
    setShowMentions(null);
    setMentionQuery('');
  };

  const filtered = comments.filter(c =>
    filter === 'all' ? true : filter === 'open' ? !c.resolved : c.resolved
  );

  const P = { fontFamily: 'Fira Code, monospace' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#faf8f4', borderLeft: '1px solid #e8e4dc' }}>
      {/* Header */}
      <div style={{ background: '#0e0e0f', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e1e20', flexShrink: 0 }}>
        <span style={{ ...P, fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 2 }}>Comments</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={startAddComment} style={{ ...P, fontSize: 9, padding: '4px 10px', background: '#e8b429', color: '#0e0e0f', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>
            + Add
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e8e4dc', flexShrink: 0, background: '#f0ede6' }}>
        {['all','open','resolved'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: '7px 0', ...P, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, background: 'transparent', border: 'none', cursor: 'pointer', color: filter === f ? '#0e0e0f' : '#aaa', borderBottom: filter === f ? '2px solid #e8b429' : '2px solid transparent', transition: 'all 0.12s' }}>
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ margin: '8px 12px 0', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderLeft: '2px solid #ef4444', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ ...P, fontSize: 10, color: '#fca5a5' }}>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
        </div>
      )}

      {/* Add comment form */}
      {adding && (
        <div style={{ padding: 12, background: 'rgba(232,180,41,0.06)', borderBottom: '1px solid rgba(232,180,41,0.2)', flexShrink: 0 }}>
          <p style={{ ...P, fontSize: 9, color: '#a07800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Adding comment to selection</p>
          <textarea
            value={newText}
            onChange={e => setNewText(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Write your comment…"
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #d8d4cc', background: '#fff', ...P, fontSize: 11, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button onClick={cancelAdd} style={{ ...P, fontSize: 9, padding: '5px 12px', background: 'transparent', border: '1px solid #d8d4cc', color: '#6a6560', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>Cancel</button>
            <button onClick={submitComment} disabled={!newText.trim()} style={{ ...P, fontSize: 9, padding: '5px 12px', background: '#0e0e0f', border: 'none', color: '#e8b429', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1, opacity: newText.trim() ? 1 : 0.4 }}>Post</button>
          </div>
        </div>
      )}

      {/* Comment list */}
      <div style={{ flex: 1, overflowY: 'auto' }} className="thin-scroll">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 32 }}>
            <div style={{ width: 18, height: 18, border: '2px solid #e8e4dc', borderTopColor: '#e8b429', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ ...P, fontSize: 10, color: '#c0bbb5', textAlign: 'center', padding: '24px 12px' }}>
            {filter === 'all' ? 'No comments · select text and click + Add' : `No ${filter} comments`}
          </p>
        ) : filtered.map(c => (
          <div key={c._id}
            onClick={() => focusComment(c.anchorId)}
            style={{ padding: '12px 14px', borderBottom: '1px solid #ede9e0', cursor: 'pointer', background: '#faf8f4', opacity: c.resolved ? 0.55 : 1, transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f5f2eb'}
            onMouseLeave={e => e.currentTarget.style.background = '#faf8f4'}
          >
            {/* Author row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#e8b429', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#0e0e0f', flexShrink: 0 }}>
                {(c.author?.name || '?')[0].toUpperCase()}
              </div>
              <span style={{ ...P, fontSize: 10, color: '#1a1a1a', fontWeight: 500 }}>{c.author?.name || 'Unknown'}</span>
              <span style={{ ...P, fontSize: 9, color: '#b0aca8', marginLeft: 'auto' }}>{relTime(c.createdAt)}</span>
            </div>

            {/* Comment text */}
            <p style={{ fontSize: 12, color: '#3a3530', lineHeight: 1.55, wordBreak: 'break-word', marginBottom: 6 }}>{c.text}</p>

            {/* Orphan warning */}
            {orphanedCommentIds.includes(c._id) && (
              <div style={{ marginTop: 6, ...P, fontSize: 9, color: '#a07800', background: 'rgba(232,180,41,0.1)', border: '1px solid rgba(232,180,41,0.25)', padding: '5px 8px' }}>
                ⚠ Anchor lost after edit.{' '}
                <button onClick={e => { e.stopPropagation(); handleReanchor(c); }} style={{ background: 'none', border: 'none', color: '#e8b429', cursor: 'pointer', ...P, fontSize: 9, padding: 0, textDecoration: 'underline' }}>Re-anchor</button>
              </div>
            )}

            {/* Replies */}
            {(c.replies || []).map(reply => (
              <div key={reply._id} style={{ marginLeft: 20, marginTop: 8, paddingLeft: 10, borderLeft: '2px solid #e8e4dc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ ...P, fontSize: 9, color: '#3a3530', fontWeight: 500 }}>{reply.author?.name || 'Unknown'}</span>
                  <span style={{ ...P, fontSize: 9, color: '#c0bbb5' }}>{relTime(reply.createdAt)}</span>
                </div>
                <p style={{ fontSize: 11, color: '#4a4540', lineHeight: 1.5, wordBreak: 'break-word' }}>{renderMentions(reply.text)}</p>
              </div>
            ))}

            {/* Reply input */}
            <div style={{ marginTop: 8, marginLeft: 20, position: 'relative' }} onClick={e => e.stopPropagation()}>
              <input
                type="text"
                placeholder="Reply… (@ to mention)"
                value={replyText[c._id] || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setReplyText(prev => ({ ...prev, [c._id]: value }));
                  const at = value.lastIndexOf('@');
                  if (at >= 0) { setShowMentions(c._id); setMentionQuery(value.slice(at + 1).toLowerCase()); }
                  else { setShowMentions(null); setMentionQuery(''); }
                }}
                style={{ width: '100%', ...P, fontSize: 10, padding: '5px 8px', border: '1px solid #e0dcd4', background: '#fff', outline: 'none', boxSizing: 'border-box' }}
              />
              <button onClick={() => submitReply(c._id)} style={{ marginTop: 4, ...P, fontSize: 9, padding: '3px 10px', background: '#f0ede6', border: '1px solid #e0dcd4', color: '#6a6560', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>Reply</button>
              {showMentions === c._id && (
                <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e0dcd4', boxShadow: '2px 2px 0 rgba(14,14,15,0.08)', zIndex: 10, maxHeight: 140, overflowY: 'auto' }}>
                  {collaborators.filter(col => (col.name || '').toLowerCase().includes(mentionQuery)).map(col => (
                    <div key={col._id} onClick={() => insertMention(c._id, col)} style={{ padding: '7px 12px', cursor: 'pointer', ...P, fontSize: 11, color: '#3a3530' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0ede6'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >@{col.name}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <button onClick={e => { e.stopPropagation(); handleResolve(c); }} style={{ ...P, fontSize: 9, padding: '3px 8px', background: 'transparent', border: `1px solid ${c.resolved ? '#d8d4cc' : 'rgba(22,163,74,0.35)'}`, color: c.resolved ? '#aaa' : '#16a34a', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>
                {c.resolved ? 'Reopen' : 'Resolve'}
              </button>
              {String(c.author?._id) === String(user?.id) && (
                <button onClick={e => { e.stopPropagation(); handleDelete(c); }} style={{ ...P, fontSize: 9, background: 'none', border: 'none', color: '#c0bbb5', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
