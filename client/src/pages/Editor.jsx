import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import useEditor from '../hooks/useEditor';
import useCollaboration from '../hooks/useCollaboration';
import { createVersion } from '../api/versions';
import { exportDocx, importDocx } from '../api/exportImport';
import Ribbon from '../components/editor/Ribbon';
import Ruler  from '../components/editor/Ruler';
import FindReplaceModal    from '../components/modals/FindReplaceModal';
import TableDialog         from '../components/modals/TableDialog';
import ImageDialog         from '../components/modals/ImageDialog';
import LinkDialog          from '../components/modals/LinkDialog';
import ShareModal          from '../components/modals/ShareModal';
import WordCountModal      from '../components/modals/WordCountModal';
import VersionHistoryPanel from '../components/panels/VersionHistoryPanel';
import CommentsPanel       from '../components/panels/CommentsPanel';

const PAGE_DIMS = {
  A4:     { width: 794, minHeight: 1123 },
  Letter: { width: 816, minHeight: 1056 },
  Legal:  { width: 816, minHeight: 1344 },
};
const MARGIN_VALS = {
  normal: { t: 96, r: 96, b: 96, l: 96 },
  narrow: { t: 48, r: 48, b: 48, l: 48 },
  wide:   { t: 96, r: 192, b: 96, l: 192 },
};

export default function Editor() {
  const { id: docId } = useParams();
  const navigate      = useNavigate();
  const { user, token } = useAuth();

  const [doc,        setDoc]        = useState(null);
  const [title,      setTitle]      = useState('');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const [pageSize,        setPageSize]        = useState('A4');
  const [margins,         setMargins]         = useState('normal');
  const [lineSpacing,     setLineSpacing]     = useState('1.15');
  const [showPageNumbers, setShowPageNumbers] = useState(false);
  const [activeTab,       setActiveTab]       = useState('home');
  const [showRuler,       setShowRuler]       = useState(true);
  const [zoom,            setZoom]            = useState(100);
  const [darkMode,        setDarkMode]        = useState(false);
  const [focusMode,       setFocusMode]       = useState(false);

  const [fontFamily,     setFontFamily]     = useState('Calibri');
  const [fontSize,       setFontSize]       = useState('11');
  const [textColor,      setTextColor]      = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('#FFFF00');
  const [trackChanges,   setTrackChanges]   = useState(false);

  const [onlineUsers, setOnlineUsers] = useState([]);

  const [showFindReplace,    setShowFindReplace]    = useState(false);
  const [showTableDialog,    setShowTableDialog]    = useState(false);
  const [showImageDialog,    setShowImageDialog]    = useState(false);
  const [showLinkDialog,     setShowLinkDialog]     = useState(false);
  const [showShareModal,     setShowShareModal]     = useState(false);
  const [showWordCount,      setShowWordCount]      = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showComments,       setShowComments]       = useState(false);

  const ed = useEditor();

  const saveTimerRef       = useRef(null);
  const lastVersionContent = useRef('');
  const titleRef           = useRef(title);
  const pageSizeRef        = useRef(pageSize);
  const marginsRef         = useRef(margins);
  titleRef.current    = title;
  pageSizeRef.current = pageSize;
  marginsRef.current  = margins;

  const save = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const content = ed.getHTML();
      await api.put(`/docs/${docId}`, {
        title:    titleRef.current,
        content,
        pageSize: pageSizeRef.current,
        margins:  marginsRef.current,
      });
      setSaveStatus('saved');
      if (Math.abs(content.length - lastVersionContent.current.length) > 250) {
        lastVersionContent.current = content;
        createVersion(docId).catch(() => {});
      }
    } catch {
      setSaveStatus('error');
    }
  }, [docId, ed]);

  const scheduleSave = useCallback(() => {
    setSaveStatus('unsaved');
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(save, 2000);
  }, [save]);

  const { emitContent } = useCollaboration({
    docId, user, token,
    onRemoteUpdate: (html) => {
      if (ed.editorRef.current) {
        ed.saveRange();
        ed.editorRef.current.innerHTML = html;
        ed.restoreRange();
      }
    },
    onUsersChange: setOnlineUsers,
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/docs/${docId}`);
        setDoc(data);
        setTitle(data.title || 'Untitled Document');
        setPageSize(data.pageSize || 'A4');
        setMargins(data.margins   || 'normal');
        if (ed.editorRef.current) {
          const html = data.content || '<p><br></p>';
          ed.editorRef.current.innerHTML = html;
          ed.pushHistory(html);
          lastVersionContent.current = html;
        }
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load document');
      } finally {
        setLoading(false);
      }
    })();
  }, [docId]); // eslint-disable-line

  const handleInput = useCallback(() => {
    ed.pushHistory(ed.getHTML());
    scheduleSave();
    emitContent(ed.getHTML());
  }, [ed, scheduleSave, emitContent]);

  useEffect(() => {
    const el = ed.editorRef.current;
    if (!el || !trackChanges) return;
    const handler = (e) => {
      if (e.inputType === 'insertText' && e.data) {
        e.preventDefault();
        const sel = window.getSelection();
        if (!sel?.rangeCount) return;
        const range = sel.getRangeAt(0);
        const ins   = document.createElement('ins');
        ins.className   = 'tc-ins';
        ins.title       = `${user?.name || 'User'} inserted`;
        ins.textContent = e.data;
        range.deleteContents();
        range.insertNode(ins);
        const nr = document.createRange();
        nr.setStartAfter(ins);
        nr.collapse(true);
        sel.removeAllRanges();
        sel.addRange(nr);
        handleInput();
      }
    };
    el.addEventListener('beforeinput', handler);
    return () => el.removeEventListener('beforeinput', handler);
  }, [trackChanges, user, handleInput]); // eslint-disable-line

  const acceptAllChanges = useCallback(() => {
    const el = ed.editorRef.current; if (!el) return;
    el.querySelectorAll('del.tc-del').forEach(d => d.remove());
    el.querySelectorAll('ins.tc-ins').forEach(i => i.replaceWith(...i.childNodes));
    el.normalize(); ed.pushHistory(el.innerHTML); scheduleSave();
  }, [ed, scheduleSave]);

  const rejectAllChanges = useCallback(() => {
    const el = ed.editorRef.current; if (!el) return;
    el.querySelectorAll('ins.tc-ins').forEach(i => i.remove());
    el.querySelectorAll('del.tc-del').forEach(d => d.replaceWith(...d.childNodes));
    el.normalize(); ed.pushHistory(el.innerHTML); scheduleSave();
  }, [ed, scheduleSave]);

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'f') { e.preventDefault(); setShowFindReplace(true); }
        if (e.key === 's') { e.preventDefault(); save(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [save]);

  useEffect(() => {
    const handler = (e) => {
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
        e.preventDefault(); e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveStatus]);

  const applyFont = (font) => { setFontFamily(font); ed.exec('fontName', font); };
  const applySize = (size) => {
    setFontSize(size);
    const ptToSize = {8:1,9:1,10:2,11:2,12:2,14:3,16:3,18:4,20:4,24:4,28:5,32:5,36:5,48:6,60:7,72:7};
    ed.exec('fontSize', String(ptToSize[+size] || 3));
    setTimeout(() => {
      ed.editorRef.current?.querySelectorAll('font[size]').forEach(el => {
        el.removeAttribute('size'); el.style.fontSize = `${size}pt`;
      });
    }, 0);
  };
  const applyTextColor = (c) => { setTextColor(c);      ed.exec('foreColor', c); };
  const applyHighlight = (c) => { setHighlightColor(c); ed.exec('hiliteColor', c); };

  const handleInsertLink = useCallback((url, text, newTab) => {
    ed.restoreRange();
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      ed.exec('createLink', url);
      if (newTab) setTimeout(() => {
        ed.editorRef.current?.querySelectorAll(`a[href="${url}"]`).forEach(a => { a.target = '_blank'; });
      }, 0);
    } else {
      ed.insertHTML(`<a href="${url}"${newTab ? ' target="_blank"' : ''}>${text || url}</a>`);
    }
  }, [ed]);

  const handleExportDocx = async () => {
    await save();
    try { await exportDocx(docId, title); }
    catch { setError('Export failed — ensure html-to-docx is installed (npm install in /server).'); }
  };
  const handleExportHTML = () => {
    const b = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Calibri,sans-serif;max-width:794px;margin:0 auto;padding:48px}</style></head><body>${ed.getHTML()}</body></html>`], { type: 'text/html' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(b), download: `${title || 'document'}.html` });
    a.click(); URL.revokeObjectURL(a.href);
  };
  const handleExportTxt = () => {
    const b = new Blob([ed.editorRef.current?.innerText || ''], { type: 'text/plain' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(b), download: `${title || 'document'}.txt` });
    a.click(); URL.revokeObjectURL(a.href);
  };
  const handleImportDocx = () => {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.docx' });
    inp.onchange = async (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      try { const { data } = await importDocx(docId, file); ed.setHTML(data.content); scheduleSave(); }
      catch { setError('Import failed — ensure mammoth is installed (npm install in /server).'); }
    };
    inp.click();
  };
  const handleImportTxt = () => {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.txt' });
    inp.onchange = (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => { ed.setHTML(`<p>${(ev.target.result||'').replace(/\n/g,'</p><p>')}</p>`); scheduleSave(); };
      reader.readAsText(file);
    };
    inp.click();
  };

  const dims  = PAGE_DIMS[pageSize]   || PAGE_DIMS.A4;
  const marg  = MARGIN_VALS[margins]  || MARGIN_VALS.normal;
  const scaledW = dims.width * zoom / 100;

  const SS_MAP = {
    saved:   { text: 'Saved ✓',      color: 'rgba(255,255,255,0.6)' },
    saving:  { text: 'Saving…',      color: 'rgba(255,255,255,0.6)' },
    unsaved: { text: '● Unsaved',    color: '#fcd34d' },
    error:   { text: '⚠ Save error', color: '#fca5a5' },
  };
  const ss = SS_MAP[saveStatus] || SS_MAP.saved;

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-[#2b579a] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Loading document…</span>
      </div>
    </div>
  );

  const ribbonProps = {
    activeTab, onTabChange: setActiveTab,
    fontFamily, fontSize, textColor, highlightColor,
    canUndo: ed.canUndo, canRedo: ed.canRedo,
    trackChanges, pageSize, margins, lineSpacing,
    showPageNumbers, showRuler, zoom, darkMode, focusMode,
    showComments, showVersionHistory,
    onExec: ed.exec,
    onApplyHeading: ed.applyHeading,
    onSetFontFamily: applyFont, onSetFontSize: applySize,
    onSetTextColor: applyTextColor, onSetHighlight: applyHighlight,
    onUndo: ed.undo, onRedo: ed.redo,
    onShowTable:       () => { ed.saveRange(); setShowTableDialog(true); },
    onShowImage:       () => { ed.saveRange(); setShowImageDialog(true); },
    onShowLink:        () => { ed.saveRange(); setShowLinkDialog(true); },
    onInsertHR:        () => { ed.restoreRange(); ed.insertHR();        scheduleSave(); },
    onInsertPageBreak: () => { ed.restoreRange(); ed.insertPageBreak(); scheduleSave(); },
    onInsertFootnote:  () => { ed.restoreRange(); ed.insertFootnote();  scheduleSave(); },
    onInsertTOC:       () => { ed.restoreRange(); ed.insertTOC();       scheduleSave(); },
    onSetPageSize:  v => { setPageSize(v); setTimeout(save, 100); },
    onSetMargins:   v => { setMargins(v);  setTimeout(save, 100); },
    onSetLineSpacing: setLineSpacing,
    onTogglePageNumbers: () => setShowPageNumbers(p => !p),
    onToggleTrackChanges: () => setTrackChanges(t => !t),
    onAcceptAll: acceptAllChanges, onRejectAll: rejectAllChanges,
    onShowWordCount:      () => setShowWordCount(true),
    onShowComments:       () => setShowComments(c => !c),
    onShowVersionHistory: () => setShowVersionHistory(v => !v),
    onToggleRuler:  () => setShowRuler(r => !r),
    onSetZoom: setZoom,
    onToggleDarkMode:  () => setDarkMode(d => !d),
    onToggleFocusMode: () => setFocusMode(f => !f),
    onShowFindReplace: () => setShowFindReplace(true),
    onExportDocx: handleExportDocx, onExportHTML: handleExportHTML,
    onExportTxt:  handleExportTxt,  onPrint: () => window.print(),
    onImportDocx: handleImportDocx, onImportTxt: handleImportTxt,
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: darkMode ? '#404040' : undefined }}>

      {/* App bar */}
      {!focusMode && (
        <div className="no-print bg-[#2b579a] text-white px-3 py-1.5 flex items-center gap-3 flex-shrink-0 min-h-[44px]">
          <button onClick={async () => { await save(); navigate('/'); }}
            className="text-white/70 hover:text-white text-sm flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
            ← Docs
          </button>

          <input value={title} onChange={e => setTitle(e.target.value)} onBlur={() => save()}
            className="flex-1 min-w-0 bg-transparent text-white font-medium text-sm border-0 border-b border-white/30 focus:border-white/80 focus:outline-none placeholder-white/40 py-0.5"
            placeholder="Document title"
          />

          <span className="text-xs flex-shrink-0 whitespace-nowrap" style={{ color: ss.color }}>{ss.text}</span>

          {onlineUsers.length > 0 && (
            <div className="flex -space-x-1.5 flex-shrink-0">
              {onlineUsers.slice(0, 5).map(u => (
                <div key={u.socketId} style={{ background: u.color }}
                  className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                  title={u.userName}>
                  {(u.userName || '?')[0].toUpperCase()}
                </div>
              ))}
              {onlineUsers.length > 5 && (
                <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-500 flex items-center justify-center text-white text-xs">+{onlineUsers.length - 5}</div>
              )}
            </div>
          )}

          <button onClick={() => { ed.saveRange(); setShowShareModal(true); }}
            className="flex-shrink-0 text-xs px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full font-medium whitespace-nowrap">
            Share
          </button>

          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 cursor-default" title={user?.name}>
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
        </div>
      )}

      {/* Ribbon */}
      {!focusMode && <Ribbon {...ribbonProps} />}

      {/* Ruler */}
      {!focusMode && showRuler && (
        <div className="no-print flex justify-center bg-[#606060] overflow-x-hidden flex-shrink-0" style={{ background: darkMode ? '#333' : undefined }}>
          <div style={{ width: scaledW, transition: 'width 0.15s' }}>
            <Ruler pageWidth={dims.width} marginLeft={marg.l} marginRight={marg.r} />
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && !focusMode && (
        <div className="no-print bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700 flex items-center justify-between flex-shrink-0">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-lg leading-none ml-2">×</button>
        </div>
      )}

      {/* Canvas + panels */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto canvas-scroll" style={{ background: darkMode ? '#505050' : '#606060' }}>
          <div className="flex justify-center py-8 px-4">
            <div className={`print-page relative bg-white shadow-2xl ${darkMode ? 'editor-dark' : ''}`}
              style={{
                width:          dims.width,
                minHeight:      dims.minHeight,
                transform:      `scale(${zoom / 100})`,
                transformOrigin:'top center',
                marginBottom:   zoom < 100 ? `${-(dims.minHeight * (1 - zoom / 100) - 32)}px` : 0,
                borderRadius:   2,
              }}>
              {showPageNumbers && <div className="page-num-top">1</div>}
              <div
                ref={ed.editorRef}
                contentEditable spellCheck suppressContentEditableWarning
                onInput={handleInput}
                onKeyDown={ed.handleKeyDown}
                onPaste={ed.handlePaste}
                style={{
                  padding:    `${marg.t}px ${marg.r}px ${marg.b}px ${marg.l}px`,
                  lineHeight: lineSpacing,
                  fontFamily: fontFamily,
                  fontSize:   `${fontSize}pt`,
                  minHeight:  dims.minHeight - marg.t - marg.b,
                  outline:    'none',
                  wordBreak:  'break-word',
                }}
              />
              {showPageNumbers && <div className="page-num-bottom">1</div>}
            </div>
          </div>
        </div>

        {showVersionHistory && (
          <div className="no-print w-80 flex-shrink-0 overflow-hidden border-l border-gray-300">
            <VersionHistoryPanel docId={docId}
              onRestore={(content, newTitle) => { ed.setHTML(content); if (newTitle) setTitle(newTitle); scheduleSave(); }}
              onClose={() => setShowVersionHistory(false)}
            />
          </div>
        )}

        {showComments && (
          <div className="no-print w-72 flex-shrink-0 overflow-hidden border-l border-gray-300">
            <CommentsPanel docId={docId} editorRef={ed.editorRef} user={user} onClose={() => setShowComments(false)} />
          </div>
        )}
      </div>

      {/* Status bar */}
      {!focusMode && (
        <div className="no-print bg-[#2b579a] text-xs px-4 py-1 flex items-center gap-4 flex-shrink-0 select-none" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {(() => { const w = ed.getWordCount(); return <><span>{w.words} words</span><span>{w.chars} chars</span></>; })()}
          <span>{pageSize}</span>
          <span>{zoom}%</span>
          {trackChanges && <span style={{ color: '#fcd34d' }}>Track Changes ON</span>}
          <span className="ml-auto" style={{ color: ss.color }}>{ss.text}</span>
        </div>
      )}

      {focusMode && (
        <button onClick={() => setFocusMode(false)}
          className="fixed top-4 right-4 z-50 px-3 py-1.5 bg-black/50 text-white text-xs rounded-full hover:bg-black/70">
          Exit Focus Mode
        </button>
      )}

      {/* Modals */}
      {showFindReplace && <FindReplaceModal editorRef={ed.editorRef} onClose={() => setShowFindReplace(false)} />}
      {showTableDialog  && <TableDialog onInsert={(r,c) => { ed.restoreRange(); ed.insertTable(r,c); scheduleSave(); }} onClose={() => setShowTableDialog(false)} />}
      {showImageDialog  && <ImageDialog onInsert={(src,alt) => { ed.restoreRange(); ed.insertImage(src,alt); scheduleSave(); }} onClose={() => setShowImageDialog(false)} />}
      {showLinkDialog   && <LinkDialog editorRef={ed.editorRef} savedRangeRef={ed.savedRangeRef} onInsert={handleInsertLink} onClose={() => setShowLinkDialog(false)} />}
      {showWordCount    && <WordCountModal stats={ed.getWordCount()} onClose={() => setShowWordCount(false)} />}
      {showShareModal && doc && <ShareModal doc={doc} onClose={() => setShowShareModal(false)} onDocUpdate={u => setDoc(d => ({ ...d, ...u }))} />}
    </div>
  );
}
