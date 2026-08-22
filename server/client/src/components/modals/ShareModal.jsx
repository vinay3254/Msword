import { useState, useEffect } from 'react';
import { generateShareLink, revokeShareLink, addCollaborator, removeCollaborator } from '../../api/share';

export default function ShareModal({ doc, onClose, onDocUpdate }) {
  const [shareToken,      setShareToken]      = useState(doc?.shareToken || null);
  const [sharePermission, setSharePermission] = useState(doc?.sharePermission || 'view');
  const [collaborators,   setCollaborators]   = useState(doc?.collaborators || []);
  const [email,     setEmail]     = useState('');
  const [permission,setPerm]      = useState('edit');
  const [loading,   setLoading]   = useState('');
  const [error,     setError]     = useState('');
  const [copied,    setCopied]    = useState(false);

  useEffect(() => {
    setShareToken(doc?.shareToken || null);
    setSharePermission(doc?.sharePermission || 'view');
    setCollaborators(doc?.collaborators || []);
  }, [doc]);

  const shareLink = shareToken
    ? `${window.location.origin}/shared/${shareToken}`
    : null;

  const handleGenerate = async () => {
    setLoading('link'); setError('');
    try {
      const { data } = await generateShareLink(doc._id, sharePermission);
      setShareToken(data.shareToken);
      onDocUpdate?.({ shareToken: data.shareToken, sharePermission: data.sharePermission });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to generate link');
    } finally {
      setLoading('');
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm('Revoke share link? Anyone with the current link will lose access.')) return;
    setLoading('link'); setError('');
    try {
      await revokeShareLink(doc._id);
      setShareToken(null);
      onDocUpdate?.({ shareToken: null });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to revoke link');
    } finally {
      setLoading('');
    }
  };

  const handleCopy = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleAddCollaborator = async () => {
    if (!email.trim()) return;
    setLoading('collab'); setError('');
    try {
      const { data } = await addCollaborator(doc._id, email.trim(), permission);
      setCollaborators(data);
      setEmail('');
      onDocUpdate?.({ collaborators: data });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to add collaborator');
    } finally {
      setLoading('');
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    setLoading(userId); setError('');
    try {
      await removeCollaborator(doc._id, userId);
      const updated = collaborators.filter(c => (c.user?._id || c.user) !== userId);
      setCollaborators(updated);
      onDocUpdate?.({ collaborators: updated });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to remove');
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Share Document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {/* Share link section */}
        <div className="p-6 border-b">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Share link</h3>

          <div className="flex items-center gap-2 mb-3">
            <label className="text-xs text-gray-500">Permission:</label>
            <select value={sharePermission} onChange={e => setSharePermission(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#2b579a]">
              <option value="view">View only</option>
              <option value="edit">Can edit</option>
            </select>
          </div>

          {shareLink ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input readOnly value={shareLink}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs bg-gray-50 text-gray-700 truncate" />
                <button onClick={handleCopy}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${copied ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 hover:bg-gray-50'}`}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <button onClick={handleRevoke} disabled={loading === 'link'}
                className="text-xs text-red-600 hover:text-red-700 hover:underline">
                Revoke link
              </button>
            </div>
          ) : (
            <button onClick={handleGenerate} disabled={loading === 'link'}
              className="w-full py-2 text-sm bg-[#2b579a] text-white rounded-lg hover:bg-[#1e3f73] disabled:opacity-50">
              {loading === 'link' ? 'Generating…' : 'Generate share link'}
            </button>
          )}
        </div>

        {/* Collaborators section */}
        <div className="p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Collaborators</h3>

          <div className="flex gap-2 mb-4">
            <input value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCollaborator()}
              placeholder="Email address"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2b579a]"
            />
            <select value={permission} onChange={e => setPerm(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-[#2b579a]">
              <option value="edit">Edit</option>
              <option value="view">View</option>
            </select>
            <button onClick={handleAddCollaborator} disabled={loading === 'collab'}
              className="px-3 py-2 text-sm bg-[#2b579a] text-white rounded-lg hover:bg-[#1e3f73] disabled:opacity-50">
              Add
            </button>
          </div>

          {collaborators.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">No collaborators yet</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {collaborators.map(c => {
                const u  = c.user || {};
                const id = u._id || u;
                return (
                  <div key={id} className="flex items-center justify-between py-1.5">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{u.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{u.email || ''} · {c.permission}</p>
                    </div>
                    <button onClick={() => handleRemoveCollaborator(id)} disabled={loading === id}
                      className="text-xs text-red-600 hover:text-red-700 hover:underline">
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
