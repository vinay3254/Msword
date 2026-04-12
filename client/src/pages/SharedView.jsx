import { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { getSharedDoc } from '../api/share';

const SANITIZE_HTML_OPTIONS = {
  USE_PROFILES: { html: true },
  ADD_TAGS: ['img'],
  ADD_ATTR: ['src', 'alt', 'width', 'height', 'style'],
};

function debounce(fn, delay) {
  let timeoutId;
  const debounced = (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
  debounced.cancel = () => clearTimeout(timeoutId);
  return debounced;
}

export default function SharedView() {
  const { token }  = useParams();
  const editorRef  = useRef(null);
  const [doc,      setDoc]     = useState(null);
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState('');

  const PAGE_DIMS   = { A4: { w: 794, h: 1123 }, Letter: { w: 816, h: 1056 }, Legal: { w: 816, h: 1344 } };
  const MARGIN_VALS = { normal: 96, narrow: 48, wide: 192 };
  const saveSharedContent = useCallback(
    debounce(async (html) => {
      try {
        await axios.put(`/api/share/doc/${token}/content`, { content: html });
      } catch (err) {
        console.error('Shared save failed', err);
      }
    }, 2000),
    [token]
  );

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getSharedDoc(token);
        setDoc(data);
        if (editorRef.current) {
          editorRef.current.innerHTML = DOMPurify.sanitize(data.content || '<p><br></p>', SANITIZE_HTML_OPTIONS);
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
      editorRef.current.innerHTML = DOMPurify.sanitize(doc.content || '<p><br></p>', SANITIZE_HTML_OPTIONS);
    }
  }, [doc]);

  useEffect(() => () => {
    saveSharedContent.cancel?.();
  }, [saveSharedContent]);

  const SHARED_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,300&family=Fira+Code:wght@400;500&display=swap');
    .sv-root { min-height: 100vh; display: flex; flex-direction: column; background: #0e0e0f; font-family: 'Fira Code', monospace; }
    .sv-banner { background: #0e0e0f; border-bottom: 1px solid #1e1e20; padding: 0 16px; display: flex; align-items: center; gap: 12px; min-height: 44px; flex-shrink: 0; }
    .sv-brand { width: 28px; height: 28px; background: #e8b429; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; color: #0e0e0f; clip-path: polygon(0 0, 100% 0, 100% 75%, 82% 100%, 0 100%); flex-shrink: 0; font-family: 'Fraunces', serif; }
    .sv-title { font-family: 'Fraunces', serif; font-size: 14px; font-weight: 500; color: #f5f2eb; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
    .sv-sub { font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 1.5px; }
    .sv-badge { font-size: 9px; padding: 3px 8px; border: 1px solid; text-transform: uppercase; letter-spacing: 1px; flex-shrink: 0; }
    .sv-badge.edit { border-color: rgba(22,163,74,0.4); color: #4ade80; background: rgba(22,163,74,0.08); }
    .sv-badge.view { border-color: #333; color: #666; }
    .sv-signin { font-size: 9px; padding: 5px 12px; background: transparent; border: 1px solid #333; color: #888; text-decoration: none; text-transform: uppercase; letter-spacing: 1.5px; transition: all 0.12s; flex-shrink: 0; }
    .sv-signin:hover { border-color: #e8b429; color: #e8b429; }
    .sv-canvas { flex: 1; overflow: auto; padding: 40px 16px; background: #606060; }
    .sv-footer { background: #0e0e0f; border-top: 1px solid #1e1e20; padding: 8px 16px; font-size: 9px; color: #444; text-align: center; flex-shrink: 0; text-transform: uppercase; letter-spacing: 1.5px; }
    .sv-footer a { color: #666; transition: color 0.12s; }
    .sv-footer a:hover { color: #e8b429; }
    @keyframes sv-spin { to { transform: rotate(360deg); } }
  `;

  if (loading) return (
    <>
      <style>{SHARED_CSS}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0e0e0f', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 28, height: 28, border: '2px solid #222', borderTopColor: '#e8b429', borderRadius: '50%', animation: 'sv-spin 0.8s linear infinite' }} />
        <span style={{ fontFamily: 'Fira Code, monospace', fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: 2 }}>Loading shared document</span>
      </div>
    </>
  );

  if (error) return (
    <>
      <style>{SHARED_CSS}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0e0e0f' }}>
        <div style={{ background: '#111', border: '1px solid #222', padding: 40, maxWidth: 380, width: '100%', margin: '0 16px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 48, fontWeight: 300, fontStyle: 'italic', color: '#333', marginBottom: 16, lineHeight: 1 }}>◇</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 500, color: '#f5f2eb', marginBottom: 8 }}>Link unavailable</div>
          <div style={{ fontFamily: 'Fira Code, monospace', fontSize: 10, color: '#555', marginBottom: 24, lineHeight: 1.6 }}>{error}</div>
          <Link to="/login" style={{ display: 'inline-block', padding: '10px 20px', background: '#e8b429', color: '#0e0e0f', fontFamily: 'Fira Code, monospace', fontSize: 10, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Sign in →
          </Link>
        </div>
      </div>
    </>
  );

  const dims  = PAGE_DIMS[doc.pageSize]   || PAGE_DIMS.A4;
  const mPad  = MARGIN_VALS[doc.margins]  || 96;
  const isEdit = doc.sharePermission === 'edit';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,300&family=Fira+Code:wght@400;500&display=swap');
        .sv-root { min-height: 100vh; display: flex; flex-direction: column; background: #0e0e0f; font-family: 'Fira Code', monospace; }
        .sv-banner { background: #0e0e0f; border-bottom: 1px solid #1e1e20; padding: 0 16px; display: flex; align-items: center; gap: 12px; min-height: 44px; flex-shrink: 0; }
        .sv-brand { width: 28px; height: 28px; background: #e8b429; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; color: #0e0e0f; clip-path: polygon(0 0, 100% 0, 100% 75%, 82% 100%, 0 100%); flex-shrink: 0; }
        .sv-badge { font-size: 9px; padding: 3px 8px; border: 1px solid; text-transform: uppercase; letter-spacing: 1px; flex-shrink: 0; }
        .sv-badge.edit { border-color: rgba(22,163,74,0.4); color: #4ade80; background: rgba(22,163,74,0.08); }
        .sv-badge.view { border-color: #333; color: #666; }
        .sv-signin:hover { border-color: #e8b429 !important; color: #e8b429 !important; }
        .sv-footer a:hover { color: #e8b429; }
      `}</style>
      <div className="sv-root">
        {/* Banner */}
        <div className="sv-banner">
          <div className="sv-brand" style={{ fontFamily: 'Georgia, serif' }}>W</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Fira Code, monospace', fontSize: 13, color: '#f5f2eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {doc.title || 'Untitled Document'}
            </div>
            <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 1 }}>
              Shared by {doc.owner?.name || 'Unknown'} · {isEdit ? 'Editable' : 'View only'}
            </div>
          </div>

          <span className={`sv-badge ${isEdit ? 'edit' : 'view'}`}>
            {isEdit ? 'Edit' : 'Read only'}
          </span>

          <Link
            to="/login"
            className="sv-signin"
            style={{ fontSize: 9, padding: '5px 12px', background: 'transparent', border: '1px solid #333', color: '#888', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: 1.5, transition: 'all 0.12s', flexShrink: 0 }}
          >
            Sign in
          </Link>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, overflow: 'auto', padding: '40px 16px', background: '#606060' }} className="canvas-scroll">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', width: dims.w, minHeight: dims.h }}>
              <div
                ref={editorRef}
                contentEditable={isEdit}
                suppressContentEditableWarning
                spellCheck={isEdit}
                onInput={(e) => saveSharedContent(e.currentTarget.innerHTML)}
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
        <div style={{ background: '#0e0e0f', borderTop: '1px solid #1e1e20', padding: '8px 16px', fontSize: 9, color: '#444', textAlign: 'center', flexShrink: 0, textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: 'Fira Code, monospace' }}>
          {isEdit ? 'Editing · Changes auto-saved' : 'Read-only view'}
          {' · '}
          <Link to="/register" style={{ color: '#666', textDecoration: 'none', transition: 'color 0.12s' }} className="sv-footer-link">
            Create your own documents →
          </Link>
        </div>
      </div>
    </>
  );
}
