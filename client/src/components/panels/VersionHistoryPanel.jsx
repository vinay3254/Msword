import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { getVersions, getVersion, createVersion, restoreVersion, deleteVersion } from '../../api/versions';

const SANITIZE_HTML_OPTIONS = {
  USE_PROFILES: { html: true },
  ADD_TAGS: ['img'],
  ADD_ATTR: ['src', 'alt', 'width', 'height', 'style'],
};

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

  const P = { fontFamily: 'Fira Code, monospace' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#faf8f4', borderLeft: '1px solid #e8e4dc' }}>
      {/* Header */}
      <div style={{ background: '#0e0e0f', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e1e20', flexShrink: 0 }}>
        <span style={{ ...P, fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 2 }}>Version History</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleSaveNow}
            disabled={saving}
            style={{ ...P, fontSize: 9, padding: '4px 10px', background: saving ? '#333' : '#e8b429', color: saving ? '#888' : '#0e0e0f', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}
          >
            {saving ? 'Saving…' : 'Save now'}
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
        </div>
      </div>

      {error && (
        <div style={{ margin: '8px 12px 0', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderLeft: '2px solid #ef4444', padding: '6px 10px' }}>
          <span style={{ ...P, fontSize: 10, color: '#fca5a5' }}>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Version list */}
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', width: preview ? 140 : '100%', flexShrink: 0, borderRight: preview ? '1px solid #e8e4dc' : 'none' }} className="thin-scroll">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 32 }}>
              <div style={{ width: 18, height: 18, border: '2px solid #e8e4dc', borderTopColor: '#e8b429', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : versions.length === 0 ? (
            <p style={{ ...P, fontSize: 10, color: '#c0bbb5', textAlign: 'center', padding: '24px 12px' }}>
              No versions yet. Click Save now to snapshot.
            </p>
          ) : versions.map(v => {
            const isActive = preview?.version._id === v._id;
            return (
              <div
                key={v._id}
                onClick={() => handlePreview(v)}
                style={{ padding: '10px 12px', borderBottom: '1px solid #ede9e0', cursor: 'pointer', background: isActive ? 'rgba(232,180,41,0.1)' : '#faf8f4', borderLeft: isActive ? '2px solid #e8b429' : '2px solid transparent', transition: 'all 0.1s', position: 'relative' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f5f2eb'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '#faf8f4'; }}
                className="group"
              >
                <div style={{ ...P, fontSize: 10, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                  {v.label || 'Auto-save'}
                </div>
                <div style={{ ...P, fontSize: 9, color: '#b0aca8' }}>{relTime(v.createdAt)}</div>
                {v.savedBy && <div style={{ ...P, fontSize: 9, color: '#c0bbb5', marginTop: 1 }}>{v.savedBy.name}</div>}
                {!isActive && (
                  <div style={{ display: 'none', gap: 4, marginTop: 6 }} className="group-hover-actions">
                    <button
                      onClick={e => { e.stopPropagation(); handleRestore(v); }}
                      disabled={restoring === v._id}
                      style={{ ...P, fontSize: 8, padding: '3px 7px', background: '#0e0e0f', color: '#e8b429', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}
                    >
                      Restore
                    </button>
                    <button
                      onClick={e => handleDelete(v, e)}
                      style={{ ...P, fontSize: 8, padding: '3px 7px', background: 'transparent', color: '#aaa', border: '1px solid #e0dcd4', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}
                    >
                      Del
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Preview pane */}
        {preview && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ background: 'rgba(232,180,41,0.08)', borderBottom: '1px solid rgba(232,180,41,0.2)', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ ...P, fontSize: 9, color: '#a07800', textTransform: 'uppercase', letterSpacing: 1 }}>
                Preview · {relTime(preview.version.createdAt)}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleRestore(preview.version)}
                  disabled={restoring === preview.version._id}
                  style={{ ...P, fontSize: 9, padding: '4px 10px', background: '#0e0e0f', color: '#e8b429', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}
                >
                  Restore
                </button>
                <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, fontSize: 12, lineHeight: 1.6, color: '#3a3530' }} className="thin-scroll">
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(preview.content || '<p style="color:#ccc">(empty)</p>', SANITIZE_HTML_OPTIONS) }} />
            </div>
          </div>
        )}
      </div>

      <style>{`
        .group:hover .group-hover-actions { display: flex !important; }
      `}</style>
    </div>
  );
}
