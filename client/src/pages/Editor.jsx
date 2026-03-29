import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

// ── Alignment icon (CSS bar stacks) ──────────────────────────────────────
function AlignIcon({ type }) {
  const cfg = {
    left:    { widths: [14,10,13,8],  align: 'flex-start'  },
    center:  { widths: [14,10,13,8],  align: 'center'      },
    right:   { widths: [14,10,13,8],  align: 'flex-end'    },
    justify: { widths: [14,14,14,10], align: 'stretch'     },
  }[type];
  return (
    <span style={{ display:'flex', flexDirection:'column', gap:'2px', alignItems: cfg.align }}>
      {cfg.widths.map((w, i) => (
        <span key={i} style={{ display:'block', height:'2px', width: w, background:'currentColor', borderRadius:'1px' }} />
      ))}
    </span>
  );
}

// ── Save status badge ─────────────────────────────────────────────────────
function SaveBadge({ status }) {
  const styles = {
    saved:   { color:'#16a34a', icon:'✓', label:'Saved'   },
    saving:  { color:'#9ca3af', icon:'⟳', label:'Saving…' },
    unsaved: { color:'#f59e0b', icon:'●', label:'Unsaved' },
    error:   { color:'#dc2626', icon:'✕', label:'Error'   },
  };
  const s = styles[status] || styles.saved;
  return (
    <span style={{ fontSize:'12px', color: s.color, display:'flex', alignItems:'center', gap:'4px', fontWeight: 500 }}>
      <span>{s.icon}</span> {s.label}
    </span>
  );
}

// ── Page size / margin constants ──────────────────────────────────────────
const PAGE_WIDTH  = { a4: 794,  letter: 816 };
const PAGE_MARGIN = {
  normal: { h: 80, v: 96  },
  narrow: { h: 48, v: 48  },
  wide:   { h: 96, v: 128 },
};

// ── Main Editor component ─────────────────────────────────────────────────
export default function Editor() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  // ── Document state ──────────────────────────────────────────────────────
  const [docTitle,   setDocTitle]   = useState('Untitled Document');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [loading,    setLoading]    = useState(true);

  // ── Ribbon state ────────────────────────────────────────────────────────
  const [activeTab,      setActiveTab]      = useState('Home');
  const [fontFamily,     setFontFamily]     = useState('serif');
  const [fontSize,       setFontSize]       = useState('12');
  const [textColor,      setTextColor]      = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('#ffff00');

  // ── Layout state ────────────────────────────────────────────────────────
  const [pageSize, setPageSize] = useState('a4');
  const [margins,  setMargins]  = useState('normal');

  // ── Dialog state ────────────────────────────────────────────────────────
  const [showTableDlg, setShowTableDlg] = useState(false);
  const [tableRows,    setTableRows]    = useState('3');
  const [tableCols,    setTableCols]    = useState('3');
  const [showImageDlg, setShowImageDlg] = useState(false);
  const [imageUrl,     setImageUrl]     = useState('');

  // ── Stats ───────────────────────────────────────────────────────────────
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // ── Refs ────────────────────────────────────────────────────────────────
  const editorRef      = useRef(null);
  const savedRangeRef  = useRef(null);
  const saveTimerRef   = useRef(null);
  const debounceRef    = useRef(null);
  const docTitleRef    = useRef(docTitle);
  const undoStack      = useRef(['']);
  const redoStack      = useRef([]);

  // Keep docTitleRef in sync with state
  useEffect(() => { docTitleRef.current = docTitle; }, [docTitle]);

  // ── Load document ────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get(`/docs/${id}`);
        if (!mounted) return;
        setDocTitle(data.title || 'Untitled Document');
        docTitleRef.current = data.title || 'Untitled Document';
        if (editorRef.current) {
          editorRef.current.innerHTML = data.content || '';
          updateCounts();
          undoStack.current = [data.content || ''];
        }
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to load document:', err);
        navigate('/');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);   // eslint-disable-line

  // Focus editor after load
  useEffect(() => {
    if (!loading && editorRef.current) editorRef.current.focus();
  }, [loading]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (debounceRef.current)  clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Auto-save (debounced 3s) ─────────────────────────────────────────────
  const scheduleAutoSave = useCallback(() => {
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!editorRef.current) return;
      setSaveStatus('saving');
      try {
        await api.put(`/docs/${id}`, {
          content: editorRef.current.innerHTML,
          title:   docTitleRef.current,
        });
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 3000);
  }, [id]);

  // ── Immediate save (e.g. before navigation) ───────────────────────────────
  const doSaveNow = async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (!editorRef.current) return;
    setSaveStatus('saving');
    try {
      await api.put(`/docs/${id}`, {
        content: editorRef.current.innerHTML,
        title:   docTitleRef.current,
      });
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  };

  const handleBack = async () => {
    if (saveStatus !== 'saved') await doSaveNow();
    navigate('/');
  };

  // ── Cursor helpers ───────────────────────────────────────────────────────
  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  }

  function restoreSelection() {
    if (!savedRangeRef.current) return;
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(savedRangeRef.current); }
  }

  // ── Core execCommand ─────────────────────────────────────────────────────
  function execCmd(cmd, val = null) {
    restoreSelection();
    try { document.execCommand(cmd, false, val); } catch (_) {}
    editorRef.current?.focus();
    scheduleAutoSave();
  }

  // ── Undo / Redo ──────────────────────────────────────────────────────────
  function pushSnapshot() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!editorRef.current) return;
      const html = editorRef.current.innerHTML;
      const us = undoStack.current;
      if (us.length === 0 || us[us.length - 1] !== html) {
        us.push(html);
        if (us.length > 50) us.shift();
        redoStack.current = [];
      }
    }, 300);
  }

  function handleUndo() {
    const us = undoStack.current, rs = redoStack.current;
    if (us.length <= 1) return;
    rs.push(us.pop());
    if (editorRef.current) { editorRef.current.innerHTML = us[us.length - 1] ?? ''; }
    updateCounts(); editorRef.current?.focus(); scheduleAutoSave();
  }

  function handleRedo() {
    const us = undoStack.current, rs = redoStack.current;
    if (rs.length === 0) return;
    const next = rs.pop(); us.push(next);
    if (editorRef.current) editorRef.current.innerHTML = next;
    updateCounts(); editorRef.current?.focus(); scheduleAutoSave();
  }

  // ── Word / Char counts ───────────────────────────────────────────────────
  function updateCounts() {
    if (!editorRef.current) return;
    const text  = editorRef.current.innerText || '';
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
    setCharCount(text.replace(/\n/g, '').length);
  }

  // ── Font helpers ─────────────────────────────────────────────────────────
  const PT_MAP = { 8:1,9:1,10:2,11:2,12:2,14:3,16:3,18:4,20:4,24:5,28:5,32:6,36:6,48:7,72:7 };

  function applyFontFamily(f) {
    setFontFamily(f); restoreSelection();
    try { document.execCommand('fontName', false, f); } catch (_) {}
    editorRef.current?.focus(); scheduleAutoSave();
  }

  function applyFontSize(pt) {
    setFontSize(String(pt));
    const scale = PT_MAP[parseInt(pt)] || 2;
    restoreSelection();
    try { document.execCommand('fontSize', false, scale); } catch (_) {}
    editorRef.current?.querySelectorAll('font[size]').forEach(el => {
      el.style.fontSize = pt + 'pt'; el.removeAttribute('size');
    });
    editorRef.current?.focus(); scheduleAutoSave();
  }

  function applyTextColor(color) {
    setTextColor(color); restoreSelection();
    try { document.execCommand('foreColor', false, color); } catch (_) {}
    editorRef.current?.focus(); scheduleAutoSave();
  }

  function applyHighlight(color) {
    setHighlightColor(color); restoreSelection();
    try { document.execCommand('hiliteColor', false, color); } catch (_) {
      try { document.execCommand('backColor', false, color); } catch (_2) {}
    }
    editorRef.current?.focus(); scheduleAutoSave();
  }

  function applyHeading(tag) { execCmd('formatBlock', tag === 'normal' ? 'p' : tag); }
  function applyAlign(dir) {
    const m = { left:'justifyLeft', center:'justifyCenter', right:'justifyRight', justify:'justifyFull' };
    execCmd(m[dir]);
  }

  // ── Table ────────────────────────────────────────────────────────────────
  function buildTableHTML(r, c) {
    const ts = 'border-collapse:collapse;width:100%;margin:8px 0;font-size:inherit;table-layout:fixed';
    const cs = 'border:1px solid #aaa;padding:6px 10px;min-width:60px;min-height:26px;vertical-align:top';
    let html = `<table style="${ts}">`;
    for (let i = 0; i < r; i++) {
      html += '<tr>';
      for (let j = 0; j < c; j++) html += `<td style="${cs}"><br></td>`;
      html += '</tr>';
    }
    return html + '</table><p><br></p>';
  }

  function openTableDlg() { saveSelection(); setShowTableDlg(true); }

  function doInsertTable() {
    const r = Math.max(1, Math.min(20, parseInt(tableRows) || 3));
    const c = Math.max(1, Math.min(20, parseInt(tableCols) || 3));
    restoreSelection();
    try { document.execCommand('insertHTML', false, buildTableHTML(r, c)); } catch (_) {}
    editorRef.current?.focus();
    setShowTableDlg(false); updateCounts(); pushSnapshot(); scheduleAutoSave();
  }

  // ── Image ────────────────────────────────────────────────────────────────
  function openImageDlg() { saveSelection(); setShowImageDlg(true); }

  function doInsertImage() {
    const url = imageUrl.trim();
    if (url) {
      restoreSelection();
      const html = `<img src="${url.replace(/"/g, '%22')}" alt="Image" style="max-width:100%;height:auto;display:block;margin:8px 0;" />`;
      try { document.execCommand('insertHTML', false, html); } catch (_) {}
      editorRef.current?.focus(); scheduleAutoSave();
    }
    setShowImageDlg(false); setImageUrl('');
  }

  // ── Horizontal rule ──────────────────────────────────────────────────────
  function insertHR() { execCmd('insertHTML', '<hr style="border:none;border-top:2px solid #ccc;margin:16px 0;" /><p><br></p>'); }

  // ── Export / Print ───────────────────────────────────────────────────────
  function blobDownload(content, filename, mime) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function saveAsTxt()  { blobDownload(editorRef.current.innerText,   (docTitleRef.current||'document')+'.txt',  'text/plain;charset=utf-8'); }
  function saveAsHtml() {
    const css = `body{font-family:serif;font-size:12pt;max-width:794px;margin:40px auto;padding:0 96px;line-height:1.5}h1{font-size:2em;font-weight:700;margin:.5em 0}h2{font-size:1.5em;font-weight:700;margin:.5em 0}h3{font-size:1.17em;font-weight:700;margin:.5em 0}p{margin:0 0 .5em}ul{padding-left:2em;list-style:disc}ol{padding-left:2em;list-style:decimal}table{border-collapse:collapse;width:100%}td{border:1px solid #aaa;padding:6px 10px;vertical-align:top}img{max-width:100%;height:auto}hr{border:none;border-top:2px solid #ccc;margin:16px 0}`;
    blobDownload(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${docTitleRef.current}</title><style>${css}</style></head><body>${editorRef.current.innerHTML}</body></html>`, (docTitleRef.current||'document')+'.html', 'text/html;charset=utf-8');
  }
  function handlePrint() { window.print(); }

  // ── Editor events ─────────────────────────────────────────────────────────
  function handleInput() { updateCounts(); pushSnapshot(); scheduleAutoSave(); }

  function handleKeyDown(e) {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;
    switch (e.key.toLowerCase()) {
      case 'b': e.preventDefault(); execCmd('bold');          break;
      case 'i': e.preventDefault(); execCmd('italic');        break;
      case 'u': e.preventDefault(); execCmd('underline');     break;
      case 'z': e.preventDefault(); e.shiftKey ? handleRedo() : handleUndo(); break;
      case 'y': e.preventDefault(); handleRedo();             break;
      case 's': e.preventDefault(); doSaveNow();              break;
    }
  }

  // ── Class helpers ─────────────────────────────────────────────────────────
  const btn  = 'inline-flex items-center justify-center w-8 h-8 rounded text-gray-700 text-sm cursor-pointer select-none border border-transparent hover:bg-[#dce6f7] hover:border-[#b0c4e8] active:bg-[#c7d9f8] transition-colors duration-75';
  const wBtn = (extra='') => `inline-flex items-center justify-center h-8 px-2 rounded gap-1 text-gray-700 text-xs cursor-pointer select-none border border-transparent hover:bg-[#dce6f7] hover:border-[#b0c4e8] active:bg-[#c7d9f8] transition-colors duration-75 ${extra}`;
  const grp  = 'flex items-center gap-0.5 px-2 border-r border-[#d0d0d0] h-full shrink-0';
  const selC = 'h-7 px-1 text-xs border border-[#c0c0c0] bg-white rounded focus:outline-none focus:border-[#5b9bd5] cursor-pointer';
  const dlgI = 'border border-[#c0c0c0] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#5b9bd5] w-full';
  const dlgOk  = 'px-4 py-1.5 text-white text-sm rounded cursor-pointer bg-[#2b579a] hover:bg-[#1e3f73] active:bg-[#163060]';
  const dlgCxl = 'px-4 py-1.5 bg-white border border-[#c0c0c0] text-sm rounded hover:bg-gray-100 cursor-pointer';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#2b579a] border-t-transparent rounded-full animate-spin" style={{borderWidth:3}}/>
          <span className="text-sm text-gray-500">Loading document…</span>
        </div>
      </div>
    );
  }

  const pageW = PAGE_WIDTH[pageSize];
  const marg  = PAGE_MARGIN[margins];

  return (
    <div className="flex flex-col overflow-hidden no-print" style={{ height:'100vh', fontFamily:'system-ui,-apple-system,sans-serif' }}>

      {/* ── App bar ──────────────────────────────────────────────────────── */}
      <div className="no-print shrink-0 flex items-center gap-3 px-3 bg-[#2b579a] text-white select-none" style={{ height:'40px' }}>
        {/* Back button */}
        <button onClick={handleBack} className="flex items-center gap-1.5 text-blue-200 hover:text-white text-xs transition-colors" title="Back to Dashboard">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9,2 4,7 9,12"/>
          </svg>
          Docs
        </button>
        <div className="w-px h-5 bg-blue-400 opacity-50" />

        {/* Doc icon */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect width="18" height="18" rx="2" fill="white" fillOpacity="0.15"/>
          <text x="2" y="13" fontSize="11" fill="white" fontWeight="900" fontFamily="serif">W</text>
        </svg>

        {/* Editable title */}
        <input
          value={docTitle}
          onChange={e => { setDocTitle(e.target.value); scheduleAutoSave(); }}
          className="bg-transparent text-white text-sm font-medium outline-none border-b border-transparent hover:border-blue-300 focus:border-white transition-colors min-w-0 flex-1 max-w-xs"
          style={{ caretColor:'white' }}
          spellCheck={false}
        />

        {/* Save status */}
        <div className="no-print">
          <SaveBadge status={saveStatus} />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <button onClick={saveAsTxt} className="px-2.5 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition text-white" title="Export .txt">.txt</button>
          <button onClick={saveAsHtml} className="px-2.5 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition text-white" title="Export .html">.html</button>
          <button onClick={handlePrint} className="px-2.5 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition text-white flex items-center gap-1" title="Print (Ctrl+P)">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="4" width="10" height="6" rx="1"/><rect x="3" y="1" width="6" height="4"/>
              <rect x="3" y="7" width="6" height="4" rx="0.5" fill="currentColor" stroke="none"/>
            </svg>
            Print
          </button>
          {/* User avatar */}
          <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-xs font-semibold ml-1">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
        </div>
      </div>

      {/* ── Ribbon ───────────────────────────────────────────────────────── */}
      <div className="no-print shrink-0 bg-[#f3f3f3] border-b border-[#c6c6c6] select-none">
        {/* Tab row */}
        <div className="flex px-2 border-b border-[#d0d0d0]" style={{ background:'#f3f3f3' }}>
          {['Home','Insert','Layout'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-1 text-xs cursor-pointer transition-colors"
              style={{
                fontWeight:   tab === activeTab ? 600 : 400,
                color:        tab === activeTab ? '#2b579a' : '#555',
                borderBottom: tab === activeTab ? '2px solid #2b579a' : '2px solid transparent',
                background:   tab === activeTab ? 'white' : 'transparent',
                marginBottom: tab === activeTab ? '-1px' : 0,
              }}
            >{tab}</button>
          ))}
        </div>

        {/* Command strip */}
        <div className="thin-scroll flex items-center overflow-x-auto" style={{ height:'54px', overflowY:'hidden' }}>

          {/* ── HOME TAB ─────────────────────────────────────────────────── */}
          {activeTab === 'Home' && <>
            {/* Undo / Redo */}
            <div className={grp}>
              <div className="flex flex-col items-center justify-center h-full gap-1">
                <div className="flex gap-0.5">
                  <button className={btn} onClick={handleUndo} title="Undo (Ctrl+Z)" style={{fontSize:'17px'}}>↺</button>
                  <button className={btn} onClick={handleRedo} title="Redo (Ctrl+Y)" style={{fontSize:'17px'}}>↻</button>
                </div>
                <div className="text-[9px] text-gray-400">Undo</div>
              </div>
            </div>

            {/* Font */}
            <div className={grp}>
              <div className="flex flex-col items-center justify-center h-full gap-1">
                <div className="flex gap-1">
                  <select value={fontFamily} onChange={e=>applyFontFamily(e.target.value)} onMouseDown={saveSelection} className={selC} style={{width:'124px'}}>
                    <option value="serif">Times New Roman</option>
                    <option value="sans-serif">Arial</option>
                    <option value="monospace">Courier New</option>
                    <option value="cursive">Comic Sans MS</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="Verdana, sans-serif">Verdana</option>
                    <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                    <option value="Impact, sans-serif">Impact</option>
                    <option value="Palatino, serif">Palatino</option>
                    <option value="Garamond, serif">Garamond</option>
                  </select>
                  <select value={fontSize} onChange={e=>applyFontSize(e.target.value)} onMouseDown={saveSelection} className={selC} style={{width:'50px'}}>
                    {[8,9,10,11,12,14,16,18,20,24,28,32,36,48,72].map(s=><option key={s} value={String(s)}>{s}</option>)}
                  </select>
                </div>
                <div className="text-[9px] text-gray-400">Font</div>
              </div>
            </div>

            {/* Style */}
            <div className={grp}>
              <div className="flex flex-col items-center justify-center h-full gap-1">
                <div className="flex gap-0.5">
                  <button className={btn} onClick={()=>execCmd('bold')}         title="Bold (Ctrl+B)"><b>B</b></button>
                  <button className={btn} onClick={()=>execCmd('italic')}       title="Italic (Ctrl+I)"><i>I</i></button>
                  <button className={btn} onClick={()=>execCmd('underline')}    title="Underline (Ctrl+U)"><u>U</u></button>
                  <button className={btn} onClick={()=>execCmd('strikeThrough')} title="Strikethrough"><s>S</s></button>
                </div>
                <div className="text-[9px] text-gray-400">Style</div>
              </div>
            </div>

            {/* Color */}
            <div className={grp}>
              <div className="flex flex-col items-center justify-center h-full gap-1">
                <div className="flex gap-0.5">
                  <label className={`${btn} relative cursor-pointer`} title="Text Color" onMouseDown={saveSelection}>
                    <span style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'1px',lineHeight:1}}>
                      <b style={{fontSize:'13px',fontFamily:'serif',color:'#222'}}>A</b>
                      <span style={{width:'14px',height:'3px',borderRadius:'1px',background:textColor,display:'block'}}/>
                    </span>
                    <input type="color" value={textColor} onChange={e=>applyTextColor(e.target.value)} style={{position:'absolute',inset:0,opacity:0,cursor:'pointer'}}/>
                  </label>
                  <label className={`${btn} relative cursor-pointer`} title="Highlight Color" onMouseDown={saveSelection}>
                    <span style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'1px',lineHeight:1}}>
                      <span style={{fontSize:'11px',fontFamily:'sans-serif',color:'#222',fontWeight:600}}>ab</span>
                      <span style={{width:'14px',height:'3px',borderRadius:'1px',background:highlightColor,display:'block'}}/>
                    </span>
                    <input type="color" value={highlightColor} onChange={e=>applyHighlight(e.target.value)} style={{position:'absolute',inset:0,opacity:0,cursor:'pointer'}}/>
                  </label>
                </div>
                <div className="text-[9px] text-gray-400">Color</div>
              </div>
            </div>

            {/* Paragraph */}
            <div className={grp}>
              <div className="flex flex-col items-center justify-center h-full gap-1">
                <div className="flex gap-0.5">
                  <button className={btn} onClick={()=>applyAlign('left')}    title="Align Left"><AlignIcon type="left"/></button>
                  <button className={btn} onClick={()=>applyAlign('center')}  title="Align Center"><AlignIcon type="center"/></button>
                  <button className={btn} onClick={()=>applyAlign('right')}   title="Align Right"><AlignIcon type="right"/></button>
                  <button className={btn} onClick={()=>applyAlign('justify')} title="Justify"><AlignIcon type="justify"/></button>
                  <button className={btn} onClick={()=>execCmd('insertUnorderedList')} title="Bullet List">
                    <span style={{display:'flex',flexDirection:'column',gap:'2px',fontSize:'9px',lineHeight:'1.1',alignItems:'flex-start'}}>
                      <span>• ━</span><span>• ━</span><span>• ━</span>
                    </span>
                  </button>
                  <button className={btn} onClick={()=>execCmd('insertOrderedList')} title="Numbered List">
                    <span style={{display:'flex',flexDirection:'column',gap:'2px',fontSize:'9px',lineHeight:'1.1',alignItems:'flex-start'}}>
                      <span>1.━</span><span>2.━</span><span>3.━</span>
                    </span>
                  </button>
                  <button className={btn} onClick={()=>execCmd('indent')}  title="Indent">
                    <svg width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                      <line x1="6" y1="2" x2="14" y2="2"/><line x1="6" y1="7" x2="14" y2="7"/><line x1="6" y1="12" x2="14" y2="12"/>
                      <polyline points="1,4 4,7 1,10" fill="none"/>
                    </svg>
                  </button>
                  <button className={btn} onClick={()=>execCmd('outdent')} title="Outdent">
                    <svg width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                      <line x1="6" y1="2" x2="14" y2="2"/><line x1="6" y1="7" x2="14" y2="7"/><line x1="6" y1="12" x2="14" y2="12"/>
                      <polyline points="4,4 1,7 4,10" fill="none"/>
                    </svg>
                  </button>
                </div>
                <div className="text-[9px] text-gray-400">Paragraph</div>
              </div>
            </div>

            {/* Styles */}
            <div className={grp}>
              <div className="flex flex-col items-center justify-center h-full gap-1">
                <select onChange={e=>applyHeading(e.target.value)} onMouseDown={saveSelection} defaultValue="normal" className={selC} style={{width:'108px'}}>
                  <option value="normal">Normal Text</option>
                  <option value="h1">Heading 1</option>
                  <option value="h2">Heading 2</option>
                  <option value="h3">Heading 3</option>
                </select>
                <div className="text-[9px] text-gray-400">Styles</div>
              </div>
            </div>

            {/* Editing */}
            <div className="flex items-center px-2 h-full shrink-0">
              <div className="flex flex-col items-center justify-center h-full gap-1">
                <button className={wBtn()} onClick={()=>execCmd('removeFormat')} title="Clear Formatting">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3">
                    <path d="M1 3h11M4 3l1 7M9 3l-1 7M3 10h7" strokeLinecap="round"/>
                    <line x1="10" y1="8" x2="13" y2="11" stroke="red" strokeWidth="1.5"/>
                    <line x1="13" y1="8" x2="10" y2="11" stroke="red" strokeWidth="1.5"/>
                  </svg>
                  <span>Clear</span>
                </button>
                <div className="text-[9px] text-gray-400">Editing</div>
              </div>
            </div>
          </>}

          {/* ── INSERT TAB ───────────────────────────────────────────────── */}
          {activeTab === 'Insert' && <>
            {/* Table */}
            <div className={grp}>
              <div className="flex flex-col items-center justify-center h-full gap-1">
                <button className={wBtn()} onClick={openTableDlg} title="Insert Table">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <rect x="1" y="1" width="12" height="12" rx="1"/>
                    <line x1="1" y1="5"  x2="13" y2="5"/><line x1="1" y1="9"  x2="13" y2="9"/>
                    <line x1="5" y1="1"  x2="5"  y2="13"/><line x1="9" y1="1" x2="9" y2="13"/>
                  </svg>
                  <span>Table</span>
                </button>
                <div className="text-[9px] text-gray-400">Tables</div>
              </div>
            </div>

            {/* Illustrations */}
            <div className={grp}>
              <div className="flex flex-col items-center justify-center h-full gap-1">
                <button className={wBtn()} onClick={openImageDlg} title="Insert Image from URL">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <rect x="1" y="2" width="12" height="10" rx="1"/>
                    <circle cx="4.5" cy="5" r="1.5" fill="none"/>
                    <polyline points="1,10 5,6 8,9 10,7 13,10"/>
                  </svg>
                  <span>Image</span>
                </button>
                <div className="text-[9px] text-gray-400">Illustrations</div>
              </div>
            </div>

            {/* Elements */}
            <div className={grp}>
              <div className="flex flex-col items-center justify-center h-full gap-1">
                <button className={wBtn()} onClick={insertHR} title="Insert Horizontal Rule">
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="1" y1="5" x2="13" y2="5" strokeLinecap="round"/>
                  </svg>
                  <span>H. Rule</span>
                </button>
                <div className="text-[9px] text-gray-400">Elements</div>
              </div>
            </div>
          </>}

          {/* ── LAYOUT TAB ──────────────────────────────────────────────── */}
          {activeTab === 'Layout' && <>
            {/* Page Size */}
            <div className={grp}>
              <div className="flex flex-col items-center justify-center h-full gap-1">
                <div className="flex gap-1">
                  {['a4','letter'].map(size => (
                    <button
                      key={size}
                      onClick={() => setPageSize(size)}
                      className={`h-7 px-3 text-xs rounded border transition-colors cursor-pointer ${pageSize===size ? 'bg-[#2b579a] text-white border-[#2b579a]' : 'bg-white text-gray-700 border-[#c0c0c0] hover:bg-[#dce6f7]'}`}
                    >
                      {size.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="text-[9px] text-gray-400">Page Size</div>
              </div>
            </div>

            {/* Margins */}
            <div className={grp}>
              <div className="flex flex-col items-center justify-center h-full gap-1">
                <div className="flex gap-1">
                  {['normal','narrow','wide'].map(m => (
                    <button
                      key={m}
                      onClick={() => setMargins(m)}
                      className={`h-7 px-3 text-xs rounded border transition-colors cursor-pointer capitalize ${margins===m ? 'bg-[#2b579a] text-white border-[#2b579a]' : 'bg-white text-gray-700 border-[#c0c0c0] hover:bg-[#dce6f7]'}`}
                    >
                      {m.charAt(0).toUpperCase()+m.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="text-[9px] text-gray-400">Margins</div>
              </div>
            </div>

            {/* Page info */}
            <div className="flex items-center px-4 h-full shrink-0">
              <div className="text-xs text-gray-400">
                <div>{pageW} × {pageSize==='a4'?'1123':'1056'} px</div>
                <div>Margins: {marg.h}px / {marg.v}px</div>
              </div>
            </div>
          </>}

        </div>{/* end command strip */}
      </div>{/* end ribbon */}

      {/* ── Canvas ───────────────────────────────────────────────────────── */}
      <div className="canvas-scroll flex-1 overflow-y-auto" style={{ background:'#808080', padding:'32px 40px' }}>
        <div
          className="print-page mx-auto bg-white"
          style={{
            width:     pageW + 'px',
            minHeight: pageSize==='a4' ? '1123px' : '1056px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.55)',
            padding:   `${marg.h}px ${marg.v}px`,
            transition:'all 0.2s',
          }}
        >
          <div
            ref={editorRef}
            contentEditable="true"
            suppressContentEditableWarning={true}
            spellCheck="true"
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onMouseUp={saveSelection}
            onKeyUp={saveSelection}
            style={{
              outline:'none',
              minHeight: pageSize==='a4' ? '960px' : '890px',
              fontFamily:'serif',
              fontSize:'12pt',
              lineHeight:'1.6',
              color:'#000',
              wordBreak:'break-word',
            }}
          />
        </div>
        <div style={{ height:'40px' }} />
      </div>

      {/* ── Status bar ───────────────────────────────────────────────────── */}
      <div
        className="no-print shrink-0 flex items-center justify-between px-4 text-white text-xs select-none"
        style={{ height:'24px', background:'#2b579a' }}
      >
        <span>Words: <b>{wordCount}</b> &nbsp;|&nbsp; Characters: <b>{charCount}</b></span>
        <span>
          {pageSize.toUpperCase()} &nbsp;|&nbsp; {margins.charAt(0).toUpperCase()+margins.slice(1)} margins &nbsp;|&nbsp; Page 1 of 1
        </span>
      </div>

      {/* ── Table Dialog ─────────────────────────────────────────────────── */}
      {showTableDlg && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background:'rgba(0,0,0,0.42)' }}
          onClick={e => { if(e.target===e.currentTarget){setShowTableDlg(false);editorRef.current?.focus();}}}
        >
          <div className="bg-white border border-[#c6c6c6] rounded-lg shadow-2xl p-6" style={{width:'280px'}}>
            <h3 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Insert Table</h3>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm text-gray-600 whitespace-nowrap">Rows</label>
                <input type="number" min="1" max="20" value={tableRows} onChange={e=>setTableRows(e.target.value)} className={dlgI} style={{width:'80px',textAlign:'center'}} autoFocus/>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm text-gray-600 whitespace-nowrap">Columns</label>
                <input type="number" min="1" max="20" value={tableCols} onChange={e=>setTableCols(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doInsertTable()} className={dlgI} style={{width:'80px',textAlign:'center'}}/>
              </div>
            </div>
            {/* Preview */}
            <div className="mb-4 p-2 bg-gray-50 rounded border border-gray-200">
              <div className="text-[10px] text-gray-400 mb-1">Preview</div>
              <div style={{display:'inline-grid',gridTemplateColumns:`repeat(${Math.min(parseInt(tableCols)||3,8)},14px)`,gap:'1px'}}>
                {Array.from({length:Math.min(parseInt(tableRows)||3,6)*Math.min(parseInt(tableCols)||3,8)}).map((_,i)=>(
                  <div key={i} style={{width:14,height:10,background:'white',border:'1px solid #aaa',borderRadius:1}}/>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className={dlgCxl} onClick={()=>{setShowTableDlg(false);editorRef.current?.focus();}}>Cancel</button>
              <button className={dlgOk}  onClick={doInsertTable}>Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Image Dialog ─────────────────────────────────────────────────── */}
      {showImageDlg && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background:'rgba(0,0,0,0.42)' }}
          onClick={e => { if(e.target===e.currentTarget){setShowImageDlg(false);editorRef.current?.focus();}}}
        >
          <div className="bg-white border border-[#c6c6c6] rounded-lg shadow-2xl p-6" style={{width:'400px'}}>
            <h3 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Insert Image</h3>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1.5">Image URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={e=>setImageUrl(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&doInsertImage()}
                className={dlgI}
                placeholder="https://example.com/image.jpg"
                autoFocus
              />
            </div>
            {imageUrl.trim() && (
              <div className="mb-4 p-2 bg-gray-50 rounded border border-gray-200 flex items-center justify-center" style={{height:'80px',overflow:'hidden'}}>
                <img src={imageUrl} alt="preview" style={{maxHeight:'72px',maxWidth:'100%',objectFit:'contain'}} onError={e=>e.target.style.display='none'}/>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button className={dlgCxl} onClick={()=>{setShowImageDlg(false);setImageUrl('');editorRef.current?.focus();}}>Cancel</button>
              <button className={dlgOk}  onClick={doInsertImage} disabled={!imageUrl.trim()}>Insert</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
