import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSharedDoc } from '../api/share';

export default function SharedView() {
  const { token }  = useParams();
  const editorRef  = useRef(null);
  const [doc,      setDoc]     = useState(null);
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState('');

  const PAGE_DIMS   = { A4: { w: 794, h: 1123 }, Letter: { w: 816, h: 1056 }, Legal: { w: 816, h: 1344 } };
  const MARGIN_VALS = { normal: 96, narrow: 48, wide: 192 };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getSharedDoc(token);
        setDoc(data);
        if (editorRef.current) {
          editorRef.current.innerHTML = data.content || '<p><br></p>';
        }
      } catch (e) {
        setError(e.response?.data?.message || 'This link is invalid or has been revoked.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Re-set content when editorRef is available and doc is loaded
  useEffect(() => {
    if (doc && editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = doc.content || '<p><br></p>';
    }
  }, [doc]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-[#2b579a] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Loading shared document…</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔗</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Link unavailable</h2>
        <p className="text-sm text-gray-500 mb-5">{error}</p>
        <Link to="/login" className="inline-block px-4 py-2 bg-[#2b579a] text-white rounded-lg text-sm font-medium hover:bg-[#1e3f73]">
          Sign in
        </Link>
      </div>
    </div>
  );

  const dims  = PAGE_DIMS[doc.pageSize]   || PAGE_DIMS.A4;
  const mPad  = MARGIN_VALS[doc.margins]  || 96;
  const isEdit = doc.sharePermission === 'edit';

  return (
    <div className="min-h-screen flex flex-col bg-[#606060]">
      {/* Banner */}
      <div className="bg-[#2b579a] text-white px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
        <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center flex-shrink-0">
          <span className="text-[#2b579a] font-black text-sm font-serif leading-none">W</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{doc.title || 'Untitled Document'}</div>
          <div className="text-xs text-white/60">
            Shared by {doc.owner?.name || 'Unknown'} · {isEdit ? 'You can edit' : 'View only'}
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isEdit ? 'bg-green-500/30 text-green-200' : 'bg-white/20 text-white/80'}`}>
          {isEdit ? 'Edit' : 'Read only'}
        </span>
        <Link to="/login"
          className="flex-shrink-0 text-xs px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full font-medium whitespace-nowrap">
          Sign in
        </Link>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto canvas-scroll py-8 px-4">
        <div className="flex justify-center">
          <div className="bg-white shadow-2xl" style={{ width: dims.w, minHeight: dims.h, borderRadius: 2 }}>
            <div
              ref={editorRef}
              contentEditable={isEdit}
              suppressContentEditableWarning
              spellCheck={isEdit}
              style={{
                padding:    `${mPad}px`,
                minHeight:  dims.h - mPad * 2,
                outline:    'none',
                wordBreak:  'break-word',
                lineHeight: '1.15',
                fontFamily: 'Calibri, Arial, sans-serif',
                fontSize:   '11pt',
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#2b579a] text-white/50 text-xs px-4 py-1.5 text-center flex-shrink-0">
        {isEdit ? 'You are editing this shared document. Changes are not saved automatically.' : 'Read-only view · '}
        <Link to="/register" className="text-white/70 hover:text-white underline ml-1">
          Create your own documents →
        </Link>
      </div>
    </div>
  );
}
