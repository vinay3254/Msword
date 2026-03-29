// MSWord Clone — Single React Component
// Open index.html in Chrome or Edge to run (no build step required)
// export default MSWord; ← uncomment when using in a bundled React project

const { useState, useRef, useEffect } = React;

// ─── Tiny SVG-less alignment icons (CSS bar stacks) ─────────────────────────
function AlignIcon({ type }) {
  const lines = {
    left:    [14, 10, 13, 8],
    center:  [14, 10, 13, 8],
    right:   [14, 10, 13, 8],
    justify: [14, 14, 14, 10],
  };
  const align = { left: 'flex-start', center: 'center', right: 'flex-end', justify: 'stretch' };
  return (
    <span style={{ display:'flex', flexDirection:'column', gap:'2px', alignItems: align[type] }}>
      {lines[type].map((w, i) => (
        <span key={i} style={{ display:'block', height:'2px', width: w+'px', background:'currentColor', borderRadius:'1px' }} />
      ))}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
function MSWord() {

  // ── State ────────────────────────────────────────────────────────────────
  const [fontFamily,      setFontFamily]      = useState('serif');
  const [fontSize,        setFontSize]        = useState('12');
  const [textColor,       setTextColor]       = useState('#000000');
  const [highlightColor,  setHighlightColor]  = useState('#ffff00');
  const [wordCount,       setWordCount]       = useState(0);
  const [charCount,       setCharCount]       = useState(0);
  const [showTableDlg,    setShowTableDlg]    = useState(false);
  const [tableRows,       setTableRows]       = useState('3');
  const [tableCols,       setTableCols]       = useState('3');
  const [showNewDocDlg,   setShowNewDocDlg]   = useState(false);
  const [activeTab,       setActiveTab]       = useState('Home');

  // ── Refs ─────────────────────────────────────────────────────────────────
  const editorRef       = useRef(null);
  const savedRangeRef   = useRef(null);
  const fileInputRef    = useRef(null);
  const debounceRef     = useRef(null);
  const undoStack       = useRef(['']);
  const redoStack       = useRef([]);

  // ── Cursor helpers ────────────────────────────────────────────────────────
  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    if (!savedRangeRef.current) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  }

  // ── Core execCommand wrapper ──────────────────────────────────────────────
  function execCmd(cmd, val = null) {
    restoreSelection();
    try { document.execCommand(cmd, false, val); } catch (_) {}
    editorRef.current.focus();
  }

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  function pushSnapshot() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!editorRef.current) return;
      const html = editorRef.current.innerHTML;
      const stack = undoStack.current;
      if (stack.length === 0 || stack[stack.length - 1] !== html) {
        stack.push(html);
        if (stack.length > 50) stack.shift();
        redoStack.current = [];
      }
    }, 300);
  }

  function handleUndo() {
    const us = undoStack.current, rs = redoStack.current;
    if (us.length <= 1) return;
    const cur = us.pop();
    rs.push(cur);
    editorRef.current.innerHTML = us[us.length - 1] ?? '';
    updateCounts();
    editorRef.current.focus();
  }

  function handleRedo() {
    const us = undoStack.current, rs = redoStack.current;
    if (rs.length === 0) return;
    const next = rs.pop();
    us.push(next);
    editorRef.current.innerHTML = next;
    updateCounts();
    editorRef.current.focus();
  }

  // ── Word / Char counts ────────────────────────────────────────────────────
  function updateCounts() {
    if (!editorRef.current) return;
    const text  = editorRef.current.innerText || '';
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
    setCharCount(text.replace(/\n/g, '').length);
  }

  // ── Font helpers ──────────────────────────────────────────────────────────
  const PT_MAP = { 8:1, 9:1, 10:2, 11:2, 12:2, 14:3, 16:3, 18:4, 20:4, 24:5, 28:5, 32:6, 36:6, 48:7, 72:7 };

  function applyFontFamily(family) {
    setFontFamily(family);
    restoreSelection();
    try { document.execCommand('fontName', false, family); } catch (_) {}
    editorRef.current.focus();
  }

  function applyFontSize(pt) {
    setFontSize(String(pt));
    const scale = PT_MAP[parseInt(pt)] || 2;
    restoreSelection();
    try { document.execCommand('fontSize', false, scale); } catch (_) {}
    // Replace <font size="N"> with inline font-size for precise pt sizing
    editorRef.current.querySelectorAll('font[size]').forEach(el => {
      el.style.fontSize = pt + 'pt';
      el.removeAttribute('size');
    });
    editorRef.current.focus();
  }

  function applyTextColor(color) {
    setTextColor(color);
    restoreSelection();
    try { document.execCommand('foreColor', false, color); } catch (_) {}
    editorRef.current.focus();
  }

  function applyHighlight(color) {
    setHighlightColor(color);
    restoreSelection();
    try { document.execCommand('hiliteColor', false, color); } catch (_) {
      try { document.execCommand('backColor', false, color); } catch (_2) {}
    }
    editorRef.current.focus();
  }

  function applyHeading(tag) {
    execCmd('formatBlock', tag === 'normal' ? 'p' : tag);
  }

  function applyAlignment(dir) {
    const MAP = { left:'justifyLeft', center:'justifyCenter', right:'justifyRight', justify:'justifyFull' };
    execCmd(MAP[dir]);
  }

  // ── Table ─────────────────────────────────────────────────────────────────
  function buildTableHTML(rows, cols) {
    const ts = 'border-collapse:collapse;width:100%;margin:8px 0;font-size:inherit;table-layout:fixed';
    const cs = 'border:1px solid #aaa;padding:6px 10px;min-width:60px;min-height:26px;vertical-align:top';
    let html = `<table style="${ts}">`;
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        html += `<td style="${cs}"><br></td>`;
      }
      html += '</tr>';
    }
    html += '</table><p><br></p>';
    return html;
  }

  function openTableDialog() {
    saveSelection();
    setShowTableDlg(true);
  }

  function doInsertTable() {
    const rows = Math.max(1, Math.min(20, parseInt(tableRows) || 3));
    const cols = Math.max(1, Math.min(20, parseInt(tableCols) || 3));
    restoreSelection();
    try { document.execCommand('insertHTML', false, buildTableHTML(rows, cols)); } catch (_) {}
    editorRef.current.focus();
    setShowTableDlg(false);
    updateCounts();
    pushSnapshot();
  }

  // ── File operations ───────────────────────────────────────────────────────
  function blobDownload(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function saveAsTxt() {
    blobDownload(editorRef.current.innerText, 'document.txt', 'text/plain;charset=utf-8');
  }

  function saveAsHtml() {
    const body = editorRef.current.innerHTML;
    const full = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Document</title><style>
body{font-family:serif;font-size:12pt;max-width:794px;margin:40px auto;padding:0 96px;line-height:1.5}
h1{font-size:2em;font-weight:bold;margin:.5em 0}
h2{font-size:1.5em;font-weight:bold;margin:.5em 0}
h3{font-size:1.17em;font-weight:bold;margin:.5em 0}
p{margin:0 0 .5em}
ul{padding-left:2em;list-style:disc}
ol{padding-left:2em;list-style:decimal}
table{border-collapse:collapse;width:100%}
td{border:1px solid #aaa;padding:6px 10px;vertical-align:top}
</style></head><body>${body}</body></html>`;
    blobDownload(full, 'document.html', 'text/html;charset=utf-8');
  }

  function handleNewDocument() {
    if (editorRef.current.innerText.trim()) {
      setShowNewDocDlg(true);
    } else {
      editorRef.current.innerHTML = '';
      updateCounts();
    }
  }

  function confirmNewDocument() {
    editorRef.current.innerHTML = '';
    undoStack.current = [''];
    redoStack.current = [];
    updateCounts();
    setShowNewDocDlg(false);
    setTimeout(() => editorRef.current.focus(), 50);
  }

  function triggerOpenFile() {
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  }

  function handleFileOpen(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      editorRef.current.innerText = evt.target.result;
      updateCounts();
      pushSnapshot();
      editorRef.current.focus();
    };
    reader.readAsText(file);
  }

  // ── Editor events ─────────────────────────────────────────────────────────
  function handleInput() {
    updateCounts();
    pushSnapshot();
  }

  function handleKeyDown(e) {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;
    switch (e.key.toLowerCase()) {
      case 'b': e.preventDefault(); execCmd('bold');            break;
      case 'i': e.preventDefault(); execCmd('italic');          break;
      case 'u': e.preventDefault(); execCmd('underline');       break;
      case 'z': e.preventDefault(); e.shiftKey ? handleRedo() : handleUndo(); break;
      case 'y': e.preventDefault(); handleRedo();               break;
      case 's': e.preventDefault(); saveAsTxt();                break;
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    editorRef.current.focus();
    undoStack.current = [''];

    const guard = e => {
      if (editorRef.current && editorRef.current.innerText.trim()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, []);

  // ── Class shorthands ──────────────────────────────────────────────────────
  const btn = [
    'inline-flex items-center justify-center w-8 h-8 rounded',
    'text-gray-700 text-sm cursor-pointer select-none',
    'border border-transparent',
    'hover:bg-[#dce6f7] hover:border-[#b0c4e8]',
    'active:bg-[#c7d9f8] active:border-[#90b0e0]',
    'transition-colors duration-75',
  ].join(' ');

  const wideBtn = (extra = '') => [
    'inline-flex items-center justify-center h-8 px-2 rounded gap-1',
    'text-gray-700 text-xs cursor-pointer select-none',
    'border border-transparent',
    'hover:bg-[#dce6f7] hover:border-[#b0c4e8]',
    'active:bg-[#c7d9f8]',
    'transition-colors duration-75',
    extra,
  ].join(' ');

  const grp = 'flex items-center gap-0.5 px-2 border-r border-[#d0d0d0] h-full shrink-0';

  const sel = [
    'h-7 px-1 text-xs border border-[#c0c0c0] bg-white rounded',
    'focus:outline-none focus:border-[#5b9bd5] cursor-pointer',
  ].join(' ');

  const dlgInput = [
    'border border-[#c0c0c0] rounded px-2 py-1 text-sm',
    'focus:outline-none focus:border-[#5b9bd5]',
  ].join(' ');

  const dlgOk = [
    'px-4 py-1.5 text-white text-sm rounded cursor-pointer',
    'bg-[#2b579a] hover:bg-[#1e3f73] active:bg-[#163060]',
  ].join(' ');

  const dlgCancel = [
    'px-4 py-1.5 bg-white border border-[#c0c0c0]',
    'text-sm rounded hover:bg-gray-100 cursor-pointer',
  ].join(' ');

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', fontFamily:'system-ui,-apple-system,sans-serif', overflow:'hidden' }}>

      {/* ── Title Bar ─────────────────────────────────────────────────── */}
      <div
        style={{ background:'#2b579a', color:'white', height:'36px', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 0 0 12px', flexShrink:0, userSelect:'none' }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          {/* Word "W" icon */}
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect width="20" height="20" rx="3" fill="white" fillOpacity="0.15"/>
            <text x="3" y="15" fontSize="13" fill="white" fontWeight="900" fontFamily="serif">W</text>
          </svg>
          <span style={{ fontSize:'13px', fontWeight:500 }}>Document 1 — MSWord Clone</span>
        </div>
        <div style={{ display:'flex' }}>
          {[['—','hover:bg-blue-700','w-10'],['□','hover:bg-blue-700','w-10'],['✕','hover:bg-red-600','w-10']].map(([ch, hov, w], i) => (
            <div key={i} className={`${w} h-9 flex items-center justify-center text-xs cursor-pointer ${hov} transition-colors`}>{ch}</div>
          ))}
        </div>
      </div>

      {/* ── Ribbon ───────────────────────────────────────────────────────── */}
      <div style={{ background:'#f3f3f3', borderBottom:'1px solid #c6c6c6', flexShrink:0, userSelect:'none' }}>

        {/* Tab row */}
        <div style={{ display:'flex', padding:'0 8px', borderBottom:'1px solid #d0d0d0', background:'#f3f3f3' }}>
          {['Home','Insert','Layout','Review','View'].map(tab => (
            <div
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding:'4px 14px',
                fontSize:'12px',
                cursor:'pointer',
                fontWeight: tab === activeTab ? 600 : 400,
                color: tab === activeTab ? '#2b579a' : '#555',
                borderBottom: tab === activeTab ? '2px solid #2b579a' : '2px solid transparent',
                background: tab === activeTab ? 'white' : 'transparent',
                marginBottom: tab === activeTab ? '-1px' : 0,
              }}
            >{tab}</div>
          ))}
        </div>

        {/* Command strip */}
        <div className="ribbon-scroll" style={{ display:'flex', alignItems:'center', height:'54px', overflowX:'auto', overflowY:'hidden' }}>

          {/* File Group */}
          <div className={grp}>
            <div className="flex flex-col items-center h-full justify-center gap-1">
              <div className="flex gap-0.5">
                <button className={btn} onClick={handleNewDocument} title="New Document">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M3 2h7l3 3v9H3z"/><path d="M10 2v3h3"/>
                  </svg>
                </button>
                <button className={btn} onClick={triggerOpenFile} title="Open .txt file">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M2 4h4l1.5 1.5H14v8H2z"/>
                  </svg>
                </button>
                <button className={wideBtn('font-semibold')} onClick={saveAsTxt} title="Save as plain text (Ctrl+S)">.txt</button>
                <button className={wideBtn('font-semibold')} onClick={saveAsHtml} title="Save as HTML">.html</button>
              </div>
              <div style={{ fontSize:'9px', color:'#777' }}>File</div>
            </div>
          </div>

          {/* Undo/Redo Group */}
          <div className={grp}>
            <div className="flex flex-col items-center h-full justify-center gap-1">
              <div className="flex gap-0.5">
                <button className={btn} onClick={handleUndo} title="Undo (Ctrl+Z)" style={{ fontSize:'17px' }}>↺</button>
                <button className={btn} onClick={handleRedo} title="Redo (Ctrl+Y)" style={{ fontSize:'17px' }}>↻</button>
              </div>
              <div style={{ fontSize:'9px', color:'#777' }}>Undo</div>
            </div>
          </div>

          {/* Font Group */}
          <div className={grp}>
            <div className="flex flex-col items-center h-full justify-center gap-1">
              <div className="flex gap-1 items-center">
                <select
                  value={fontFamily}
                  onChange={e => applyFontFamily(e.target.value)}
                  onMouseDown={saveSelection}
                  className={sel}
                  style={{ width:'128px' }}
                >
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
                <select
                  value={fontSize}
                  onChange={e => applyFontSize(e.target.value)}
                  onMouseDown={saveSelection}
                  className={sel}
                  style={{ width:'52px' }}
                >
                  {[8,9,10,11,12,14,16,18,20,24,28,32,36,48,72].map(s => (
                    <option key={s} value={String(s)}>{s}</option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize:'9px', color:'#777' }}>Font</div>
            </div>
          </div>

          {/* Style (BIUŠ) Group */}
          <div className={grp}>
            <div className="flex flex-col items-center h-full justify-center gap-1">
              <div className="flex gap-0.5">
                <button className={btn} onClick={() => execCmd('bold')}         title="Bold (Ctrl+B)"><b>B</b></button>
                <button className={btn} onClick={() => execCmd('italic')}       title="Italic (Ctrl+I)"><i>I</i></button>
                <button className={btn} onClick={() => execCmd('underline')}    title="Underline (Ctrl+U)"><u>U</u></button>
                <button className={btn} onClick={() => execCmd('strikeThrough')} title="Strikethrough"><s>S</s></button>
              </div>
              <div style={{ fontSize:'9px', color:'#777' }}>Style</div>
            </div>
          </div>

          {/* Color Group */}
          <div className={grp}>
            <div className="flex flex-col items-center h-full justify-center gap-1">
              <div className="flex gap-0.5">
                {/* Text color */}
                <label className={`${btn} relative cursor-pointer`} title="Text Color" onMouseDown={saveSelection}>
                  <span style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'1px', lineHeight:1 }}>
                    <span style={{ fontWeight:'bold', fontSize:'13px', fontFamily:'serif', color:'#222' }}>A</span>
                    <span style={{ width:'14px', height:'3px', borderRadius:'1px', background: textColor, display:'block' }}/>
                  </span>
                  <input
                    type="color" value={textColor}
                    onChange={e => applyTextColor(e.target.value)}
                    style={{ position:'absolute', inset:0, opacity:0, width:'100%', height:'100%', cursor:'pointer' }}
                  />
                </label>
                {/* Highlight color */}
                <label className={`${btn} relative cursor-pointer`} title="Highlight Color" onMouseDown={saveSelection}>
                  <span style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'1px', lineHeight:1 }}>
                    <span style={{ fontSize:'11px', fontFamily:'sans-serif', color:'#222', fontWeight:600 }}>ab</span>
                    <span style={{ width:'14px', height:'3px', borderRadius:'1px', background: highlightColor, display:'block' }}/>
                  </span>
                  <input
                    type="color" value={highlightColor}
                    onChange={e => applyHighlight(e.target.value)}
                    style={{ position:'absolute', inset:0, opacity:0, width:'100%', height:'100%', cursor:'pointer' }}
                  />
                </label>
              </div>
              <div style={{ fontSize:'9px', color:'#777' }}>Color</div>
            </div>
          </div>

          {/* Paragraph Group */}
          <div className={grp}>
            <div className="flex flex-col items-center h-full justify-center gap-1">
              <div className="flex gap-0.5">
                <button className={btn} onClick={() => applyAlignment('left')}    title="Align Left"><AlignIcon type="left"/></button>
                <button className={btn} onClick={() => applyAlignment('center')}  title="Align Center"><AlignIcon type="center"/></button>
                <button className={btn} onClick={() => applyAlignment('right')}   title="Align Right"><AlignIcon type="right"/></button>
                <button className={btn} onClick={() => applyAlignment('justify')} title="Justify"><AlignIcon type="justify"/></button>
                <button className={btn} onClick={() => execCmd('insertUnorderedList')} title="Bullet List">
                  <span style={{ display:'flex', flexDirection:'column', gap:'2px', fontSize:'9px', lineHeight:'1.1', alignItems:'flex-start' }}>
                    <span>• ━</span><span>• ━</span><span>• ━</span>
                  </span>
                </button>
                <button className={btn} onClick={() => execCmd('insertOrderedList')} title="Numbered List">
                  <span style={{ display:'flex', flexDirection:'column', gap:'2px', fontSize:'9px', lineHeight:'1.1', alignItems:'flex-start' }}>
                    <span>1. ━</span><span>2. ━</span><span>3. ━</span>
                  </span>
                </button>
                <button className={btn} onClick={() => execCmd('indent')}  title="Increase Indent">
                  <svg width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                    <line x1="6" y1="2"  x2="14" y2="2"/><line x1="6" y1="7"  x2="14" y2="7"/><line x1="6" y1="12" x2="14" y2="12"/>
                    <polyline points="1,4 4,7 1,10" fill="none"/>
                  </svg>
                </button>
                <button className={btn} onClick={() => execCmd('outdent')} title="Decrease Indent">
                  <svg width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                    <line x1="6" y1="2"  x2="14" y2="2"/><line x1="6" y1="7"  x2="14" y2="7"/><line x1="6" y1="12" x2="14" y2="12"/>
                    <polyline points="4,4 1,7 4,10" fill="none"/>
                  </svg>
                </button>
              </div>
              <div style={{ fontSize:'9px', color:'#777' }}>Paragraph</div>
            </div>
          </div>

          {/* Styles Group */}
          <div className={grp}>
            <div className="flex flex-col items-center h-full justify-center gap-1">
              <select
                onChange={e => applyHeading(e.target.value)}
                onMouseDown={saveSelection}
                defaultValue="normal"
                className={sel}
                style={{ width:'108px' }}
              >
                <option value="normal">Normal Text</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
              </select>
              <div style={{ fontSize:'9px', color:'#777' }}>Styles</div>
            </div>
          </div>

          {/* Insert Group */}
          <div className={grp}>
            <div className="flex flex-col items-center h-full justify-center gap-1">
              <button className={wideBtn()} onClick={openTableDialog} title="Insert Table">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="1" y="1" width="12" height="12" rx="1"/>
                  <line x1="1" y1="5"  x2="13" y2="5"/>
                  <line x1="1" y1="9"  x2="13" y2="9"/>
                  <line x1="5" y1="1"  x2="5"  y2="13"/>
                  <line x1="9" y1="1"  x2="9"  y2="13"/>
                </svg>
                <span>Table</span>
              </button>
              <div style={{ fontSize:'9px', color:'#777' }}>Insert</div>
            </div>
          </div>

          {/* Editing Group */}
          <div style={{ display:'flex', alignItems:'center', padding:'0 12px', height:'100%', flexShrink:0 }}>
            <div className="flex flex-col items-center h-full justify-center gap-1">
              <button className={wideBtn()} onClick={() => execCmd('removeFormat')} title="Clear all formatting">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d="M2 3h10M5 3l1 8M9 3l-1 8M4 11h6" strokeLinecap="round"/>
                  <line x1="11" y1="9" x2="14" y2="12" stroke="red" strokeWidth="1.5"/>
                  <line x1="14" y1="9" x2="11" y2="12" stroke="red" strokeWidth="1.5"/>
                </svg>
                <span>Clear</span>
              </button>
              <div style={{ fontSize:'9px', color:'#777' }}>Editing</div>
            </div>
          </div>

        </div>{/* end command strip */}
      </div>{/* end ribbon */}

      {/* ── Canvas ──────────────────────────────────────────────────────── */}
      <div
        className="canvas-scroll"
        style={{ flex:1, overflowY:'auto', background:'#808080', padding:'32px 40px' }}
      >
        {/* A4 Page */}
        <div
          style={{
            width: '794px',
            minHeight: '1123px',
            margin: '0 auto',
            background: 'white',
            boxShadow: '0 4px 20px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.25)',
            padding: '80px 96px',
            position: 'relative',
          }}
        >
          {/* Page border tick marks (decorative ruler feel) */}
          <div style={{ position:'absolute', top:0, left:0, right:0, height:'4px', background:'linear-gradient(to bottom, #e8e8e8, transparent)' }}/>

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
              outline: 'none',
              minHeight: '960px',
              fontFamily: 'serif',
              fontSize: '12pt',
              lineHeight: '1.6',
              color: '#000',
              wordBreak: 'break-word',
            }}
          />
        </div>

        {/* Extra space below page */}
        <div style={{ height:'40px' }}/>
      </div>

      {/* ── Status Bar ──────────────────────────────────────────────────── */}
      <div
        style={{
          height:'24px', background:'#2b579a', color:'white',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 16px', fontSize:'11px', flexShrink:0, userSelect:'none',
        }}
      >
        <span>Words: <b>{wordCount}</b> &nbsp;|&nbsp; Characters: <b>{charCount}</b></span>
        <span>Page 1 of 1 &nbsp;|&nbsp; English (US) &nbsp;|&nbsp; 100%</span>
      </div>

      {/* ── Table Insert Dialog ──────────────────────────────────────────── */}
      {showTableDlg && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowTableDlg(false); editorRef.current.focus(); }}}
        >
          <div style={{ background:'white', border:'1px solid #c6c6c6', borderRadius:'4px', padding:'22px 24px', width:'270px', boxShadow:'0 8px 32px rgba(0,0,0,0.22)' }}>
            <h3 style={{ margin:'0 0 14px', fontSize:'14px', fontWeight:600, color:'#222', paddingBottom:'10px', borderBottom:'1px solid #e0e0e0' }}>Insert Table</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginBottom:'18px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <label style={{ fontSize:'13px', color:'#444' }}>Number of rows:</label>
                <input
                  type="number" min="1" max="20" value={tableRows}
                  onChange={e => setTableRows(e.target.value)}
                  className={dlgInput}
                  style={{ width:'72px', textAlign:'center' }}
                  autoFocus
                />
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <label style={{ fontSize:'13px', color:'#444' }}>Number of columns:</label>
                <input
                  type="number" min="1" max="20" value={tableCols}
                  onChange={e => setTableCols(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doInsertTable()}
                  className={dlgInput}
                  style={{ width:'72px', textAlign:'center' }}
                />
              </div>
            </div>
            {/* Preview grid */}
            <div style={{ marginBottom:'18px', padding:'8px', background:'#f7f7f7', borderRadius:'3px', border:'1px solid #e0e0e0' }}>
              <div style={{ fontSize:'10px', color:'#888', marginBottom:'6px' }}>Preview</div>
              <div style={{ display:'inline-grid', gridTemplateColumns: `repeat(${Math.min(parseInt(tableCols)||3,8)}, 14px)`, gap:'1px' }}>
                {Array.from({ length: Math.min(parseInt(tableRows)||3,6) * Math.min(parseInt(tableCols)||3,8) }).map((_, i) => (
                  <div key={i} style={{ width:'14px', height:'10px', background:'white', border:'1px solid #aaa', borderRadius:'1px' }}/>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px' }}>
              <button className={dlgCancel} onClick={() => { setShowTableDlg(false); editorRef.current.focus(); }}>Cancel</button>
              <button className={dlgOk} onClick={doInsertTable}>Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Document Confirm Dialog ──────────────────────────────────── */}
      {showNewDocDlg && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }}>
          <div style={{ background:'white', border:'1px solid #c6c6c6', borderRadius:'4px', padding:'22px 24px', width:'340px', boxShadow:'0 8px 32px rgba(0,0,0,0.22)' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:'14px', marginBottom:'18px' }}>
              <div style={{ fontSize:'28px', lineHeight:1 }}>⚠️</div>
              <div>
                <h3 style={{ margin:'0 0 6px', fontSize:'14px', fontWeight:600, color:'#222' }}>New Document</h3>
                <p style={{ margin:0, fontSize:'13px', color:'#555', lineHeight:'1.5' }}>
                  All unsaved content will be permanently cleared.<br/>Do you want to continue?
                </p>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px' }}>
              <button className={dlgCancel} onClick={() => setShowNewDocDlg(false)}>Cancel</button>
              <button className={dlgOk}    onClick={confirmNewDocument}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hidden file input ────────────────────────────────────────────── */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt"
        style={{ display:'none' }}
        onChange={handleFileOpen}
      />

    </div>
  );
}

// ── Mount ─────────────────────────────────────────────────────────────────────
// (Remove this block and use `export default MSWord;` when bundling with Vite/CRA)
ReactDOM.createRoot(document.getElementById('root')).render(<MSWord />);
