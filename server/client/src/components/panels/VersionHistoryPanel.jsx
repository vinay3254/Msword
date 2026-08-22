import { useState, useEffect } from 'react';
import { getVersions, getVersion, createVersion, restoreVersion, deleteVersion } from '../../api/versions';

function relTime(dateStr) {
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24)  return `${hrs}h ago`;
  if (days < 7)  return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function VersionHistoryPanel({ docId, onRestore, onClose }) {
  const [versions,  setVersions]  = useState([]);
  const [preview,   setPreview]   = useState(null); // { version, content }
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [error,     setError]     = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getVersions(docId);
        setVersions(data);
      } catch {
        setError('Failed to load versions');
      } finally {
        setLoading(false);
      }
    })();
  }, [docId]);

  const handlePreview = async (v) => {
    if (preview?.version._id === v._id) { setPreview(null); return; }
    try {
      const { data } = await getVersion(docId, v._id);
      setPreview({ version: v, content: data.content });
    } catch {
      setError('Failed to load version content');
    }
  };

  const handleSaveNow = async () => {
    setSaving(true); setError('');
    try {
      const { data } = await createVersion(docId, 'Manual save');
      setVersions(prev => [data, ...prev].slice(0, 30));
    } catch {
      setError('Failed to save version');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (v) => {
    if (!window.confirm('Restore this version? Your current content will be saved as a new version first.')) return;
    setRestoring(v._id);
    try {
      const { data } = await restoreVersion(docId, v._id);
      onRestore?.(data.content, data.title);
      onClose?.();
    } catch {
      setError('Failed to restore version');
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (v, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this version?')) return;
    try {
      await deleteVersion(docId, v._id);
      setVersions(prev => prev.filter(x => x._id !== v._id));
      if (preview?.version._id === v._id) setPreview(null);
    } catch {
      setError('Failed to delete version');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">Version History</h3>
        <div className="flex items-center gap-2">
          <button onClick={handleSaveNow} disabled={saving}
            className="text-xs px-2.5 py-1 bg-[#2b579a] text-white rounded hover:bg-[#1e3f73] disabled:opacity-50">
            {saving ? 'Saving…' : 'Save now'}
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
      </div>

      {error && <div className="mx-3 mt-2 text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded">{error}</div>}

      <div className="flex flex-1 overflow-hidden">
        {/* Version list */}
        <div className={`flex flex-col overflow-y-auto thin-scroll ${preview ? 'w-36' : 'flex-1'}`}>
          {loading ? (
            <div className="flex justify-center pt-8"><div className="w-5 h-5 border-2 border-[#2b579a] border-t-transparent rounded-full animate-spin" /></div>
          ) : versions.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6 px-3">No versions yet. Save a version to track your changes.</p>
          ) : versions.map(v => (
            <div key={v._id}
              onClick={() => handlePreview(v)}
              className={`px-3 py-2.5 border-b border-gray-100 cursor-pointer hover:bg-blue-50 group ${preview?.version._id === v._id ? 'bg-blue-100' : ''}`}>
              <div className="text-xs font-medium text-gray-800 truncate">{v.label || 'Auto-save'}</div>
              <div className="text-xs text-gray-400 mt-0.5">{relTime(v.createdAt)}</div>
              {v.savedBy && <div className="text-xs text-gray-400">{v.savedBy.name}</div>}
              {preview?.version._id !== v._id && (
                <div className="hidden group-hover:flex gap-1 mt-1">
                  <button onClick={(e) => { e.stopPropagation(); handleRestore(v); }}
                    disabled={restoring === v._id}
                    className="text-xs px-1.5 py-0.5 bg-[#2b579a] text-white rounded hover:bg-[#1e3f73]">
                    Restore
                  </button>
                  <button onClick={(e) => handleDelete(v, e)}
                    className="text-xs px-1.5 py-0.5 border border-gray-300 rounded hover:bg-red-50 hover:text-red-600">
                    Del
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Preview pane */}
        {preview && (
          <div className="flex-1 flex flex-col border-l border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-amber-50 border-b border-amber-200">
              <span className="text-xs text-amber-800 font-medium">Preview — {relTime(preview.version.createdAt)}</span>
              <div className="flex gap-2">
                <button onClick={() => handleRestore(preview.version)} disabled={restoring === preview.version._id}
                  className="text-xs px-2.5 py-1 bg-[#2b579a] text-white rounded hover:bg-[#1e3f73]">
                  Restore
                </button>
                <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600 text-sm">×</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto thin-scroll p-4">
              <div className="prose prose-sm max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: preview.content || '<p class="text-gray-400">(empty)</p>' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
