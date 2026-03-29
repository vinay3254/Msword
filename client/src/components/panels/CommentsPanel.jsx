import { useState, useEffect } from 'react';
import { getComments, addComment, updateComment, deleteComment } from '../../api/comments';

function relTime(dateStr) {
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = (now - d) / 60000;
  if (diff < 1)   return 'Just now';
  if (diff < 60)  return `${Math.floor(diff)}m ago`;
  if (diff < 1440)return `${Math.floor(diff / 60)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function CommentsPanel({ docId, editorRef, user, onClose }) {
  const [comments,  setComments]  = useState([]);
  const [filter,    setFilter]    = useState('all'); // all | open | resolved
  const [newText,   setNewText]   = useState('');
  const [newAnchor, setNewAnchor] = useState('');
  const [adding,    setAdding]    = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getComments(docId);
        setComments(data);
      } catch { setError('Failed to load comments'); }
      finally  { setLoading(false); }
    })();
  }, [docId]);

  // Start adding a comment: wraps selected text in an anchor span
  const startAddComment = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { setError('Select text in the document to add a comment.'); return; }
    const id  = `cmt-${Date.now()}`;
    const range = sel.getRangeAt(0);
    const span  = document.createElement('span');
    span.setAttribute('data-comment-id', id);
    try { range.surroundContents(span); } catch { setError('Cannot comment on a partial element. Adjust selection.'); return; }
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

  const focusComment = (anchorId) => {
    const el = editorRef.current?.querySelector(`[data-comment-id="${anchorId}"]`);
    if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('comment-active'); setTimeout(() => el.classList.remove('comment-active'), 1500); }
  };

  const filtered = comments.filter(c =>
    filter === 'all' ? true : filter === 'open' ? !c.resolved : c.resolved
  );

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">Comments</h3>
        <div className="flex items-center gap-2">
          <button onClick={startAddComment}
            className="text-xs px-2.5 py-1 bg-[#2b579a] text-white rounded hover:bg-[#1e3f73]">
            + Add
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b">
        {['all','open','resolved'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-2 text-xs capitalize font-medium ${filter === f ? 'border-b-2 border-[#2b579a] text-[#2b579a]' : 'text-gray-500'}`}>
            {f}
          </button>
        ))}
      </div>

      {error && <div className="mx-3 mt-2 text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded">{error} <button className="ml-1 text-red-400" onClick={() => setError('')}>×</button></div>}

      {/* Add comment form */}
      {adding && (
        <div className="p-3 bg-yellow-50 border-b border-yellow-200">
          <p className="text-xs text-yellow-800 mb-2 font-medium">Adding comment to selected text</p>
          <textarea value={newText} onChange={e => setNewText(e.target.value)} rows={3} autoFocus
            placeholder="Write your comment…"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#2b579a]"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={cancelAdd}    className="text-xs px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
            <button onClick={submitComment} disabled={!newText.trim()}
              className="text-xs px-2.5 py-1 bg-[#2b579a] text-white rounded hover:bg-[#1e3f73] disabled:opacity-50">
              Post
            </button>
          </div>
        </div>
      )}

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto thin-scroll">
        {loading ? (
          <div className="flex justify-center pt-8"><div className="w-5 h-5 border-2 border-[#2b579a] border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6 px-3">
            {filter === 'all' ? 'No comments yet. Select text and click "+ Add" to start.' : `No ${filter} comments.`}
          </p>
        ) : filtered.map(c => (
          <div key={c._id}
            onClick={() => focusComment(c.anchorId)}
            className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${c.resolved ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-5 h-5 bg-[#2b579a] rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {(c.author?.name || '?')[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-gray-700 truncate">{c.author?.name || 'Unknown'}</span>
                  <span className="text-xs text-gray-400">{relTime(c.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{c.text}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={e => { e.stopPropagation(); handleResolve(c); }}
                className={`text-xs px-2 py-0.5 rounded border ${c.resolved ? 'border-gray-300 text-gray-500 hover:bg-gray-50' : 'border-green-300 text-green-700 hover:bg-green-50'}`}>
                {c.resolved ? 'Reopen' : 'Resolve'}
              </button>
              {String(c.author?._id) === String(user?.id) && (
                <button onClick={e => { e.stopPropagation(); handleDelete(c); }}
                  className="text-xs text-red-500 hover:text-red-700 hover:underline">
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
