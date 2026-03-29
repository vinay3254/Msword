import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

// ── Helpers ───────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now  = new Date();
  const diff = now - date;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)   return 'Just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

// ── Document thumbnail ────────────────────────────────────────────────────
function DocThumb() {
  return (
    <div className="w-full h-36 bg-white border-b border-gray-200 flex items-center justify-center p-4">
      <div className="w-full h-full bg-white shadow-inner border border-gray-100 p-3 flex flex-col gap-1.5">
        {[70, 90, 80, 60, 50].map((w, i) => (
          <div key={i} className="h-1.5 bg-gray-200 rounded-full" style={{ width: w + '%' }} />
        ))}
        <div className="h-1.5 w-0" />
        {[85, 65, 75].map((w, i) => (
          <div key={i} className="h-1.5 bg-gray-100 rounded-full" style={{ width: w + '%' }} />
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, logout }    = useAuth();
  const navigate             = useNavigate();
  const [docs,    setDocs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]  = useState('');
  const [creating, setCreating] = useState(false);
  // Inline rename state
  const [editingId,    setEditingId]    = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  // ── Fetch documents ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/docs');
        setDocs(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Create new document ─────────────────────────────────────────────────
  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data } = await api.post('/docs', { title: 'Untitled Document' });
      navigate(`/docs/${data._id}`);
    } catch {
      setError('Failed to create document');
      setCreating(false);
    }
  };

  // ── Delete document ─────────────────────────────────────────────────────
  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/docs/${id}`);
      setDocs(prev => prev.filter(d => d._id !== id));
    } catch {
      setError('Failed to delete document');
    }
  };

  // ── Start renaming ──────────────────────────────────────────────────────
  const startRename = (e, doc) => {
    e.stopPropagation();
    setEditingId(doc._id);
    setEditingTitle(doc.title);
  };

  // ── Save rename ─────────────────────────────────────────────────────────
  const saveRename = async (id) => {
    const title = editingTitle.trim() || 'Untitled Document';
    setDocs(prev => prev.map(d => d._id === id ? { ...d, title } : d));
    setEditingId(null);
    try {
      await api.put(`/docs/${id}`, { title });
    } catch {
      setError('Failed to rename document');
    }
  };

  const handleRenameKey = (e, id) => {
    if (e.key === 'Enter') saveRename(id);
    if (e.key === 'Escape') setEditingId(null);
  };

  // ── Greeting ────────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Top nav ──────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#2b579a] rounded-md flex items-center justify-center">
              <span className="text-white font-black text-base font-serif leading-none">W</span>
            </div>
            <span className="font-semibold text-gray-800 text-base">MSWord Clone</span>
          </div>

          {/* User area */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">{user?.email}</span>
            <div className="w-8 h-8 bg-[#2b579a] rounded-full flex items-center justify-center text-white text-sm font-semibold select-none">
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-red-600 transition-colors font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero / new doc ────────────────────────────────────────────────── */}
      <div className="bg-[#f8f9ff] border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-gray-500 text-sm mb-1">{greeting}, <span className="font-medium text-gray-700">{user?.name}</span></p>
          <h1 className="text-2xl font-bold text-gray-800 mb-5">Your Documents</h1>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-[#2b579a] text-white rounded-lg font-medium text-sm hover:bg-[#1e3f73] transition-colors shadow-sm disabled:opacity-60"
          >
            {creating ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
              </svg>
            )}
            {creating ? 'Creating…' : 'New Document'}
          </button>
        </div>
      </div>

      {/* ── Document grid ─────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center justify-between">
            <span>⚠ {error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-[#2b579a] border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
              <span className="text-sm text-gray-400">Loading documents…</span>
            </div>
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-24 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                <path d="M6 4h14l6 6v18H6z"/><path d="M20 4v6h6"/>
                <line x1="10" y1="14" x2="22" y2="14"/><line x1="10" y1="18" x2="22" y2="18"/><line x1="10" y1="22" x2="16" y2="22"/>
              </svg>
            </div>
            <p className="text-gray-500 font-medium mb-1">No documents yet</p>
            <p className="text-sm text-gray-400">Click "New Document" to get started</p>
          </div>
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {docs.map(doc => (
              <div
                key={doc._id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group cursor-pointer"
              >
                {/* Thumbnail — click to open */}
                <div onClick={() => navigate(`/docs/${doc._id}`)}>
                  <DocThumb />
                </div>

                {/* Info */}
                <div className="p-3">
                  {editingId === doc._id ? (
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={e => setEditingTitle(e.target.value)}
                      onBlur={() => saveRename(doc._id)}
                      onKeyDown={e => handleRenameKey(e, doc._id)}
                      className="w-full text-sm font-medium text-gray-800 border-b border-[#2b579a] outline-none bg-transparent pb-0.5"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <h3
                      className="text-sm font-medium text-gray-800 truncate cursor-pointer hover:text-[#2b579a]"
                      onClick={() => navigate(`/docs/${doc._id}`)}
                      title={doc.title}
                    >
                      {doc.title || 'Untitled Document'}
                    </h3>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(doc.lastModified)}</p>

                  {/* Action buttons — visible on hover */}
                  <div className="flex gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => startRename(e, doc)}
                      className="flex-1 py-1 text-xs text-gray-500 hover:text-[#2b579a] hover:bg-blue-50 rounded transition-colors"
                      title="Rename"
                    >
                      Rename
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(doc._id, doc.title); }}
                      className="flex-1 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 py-4 px-6 text-center text-xs text-gray-400">
        MSWord Clone — {docs.length} document{docs.length !== 1 ? 's' : ''}
      </footer>
    </div>
  );
}
