import { useState, useRef, useEffect } from 'react';

const FONTS = ['Calibri','Arial','Arial Black','Times New Roman','Georgia','Verdana','Trebuchet MS','Courier New','Garamond','Palatino Linotype','Comic Sans MS','Impact'];
const SIZES = [8,9,10,11,12,14,16,18,20,24,28,32,36,48,60,72];
const HEADINGS = [{ label:'Normal', v:'p' },{ label:'Heading 1', v:'h1' },{ label:'Heading 2', v:'h2' },{ label:'Heading 3', v:'h3' },{ label:'Heading 4', v:'h4' }];
const T_COLORS  = ['#000000','#444444','#888888','#cccccc','#ffffff','#c0392b','#e67e22','#f1c40f','#27ae60','#2980b9','#8e44ad','#16a085','#d35400','#2c3e50','#7f8c8d','#e74c3c','#3498db','#2ecc71','#9b59b6','#2b579a'];
const H_COLORS  = ['#ffff00','#00ff00','#00ffff','#ff69b4','#ff6600','#9900cc','#ffffff','#ff0000','#0000ff','#808080','none'];
const TABS      = ['Home','Insert','Layout','Review','View','Draw','Design','References','Mailings'];

const RIBBON_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&display=swap');

  .rib-root {
    background: #faf8f4;
    border-bottom: 1px solid #dedad2;
    flex-shrink: 0;
    user-select: none;
  }

  .rib-tabs {
    display: flex;
    border-bottom: 1px solid #e8e4dc;
    padding: 0 4px;
    background: #f0ede6;
    overflow-x: auto;
  }

  .rib-tabs::-webkit-scrollbar { height: 0; }

  .rib-tab {
    padding: 6px 14px;
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-weight: 400;
    color: #6a6560;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: color 0.12s;
    position: relative;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .rib-tab:hover { color: #1a1a1a; }

  .rib-tab.active {
    color: #0e0e0f;
    font-weight: 500;
  }

  .rib-tab.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 8px;
    right: 8px;
    height: 2px;
    background: #e8b429;
  }

  .rib-strip {
    display: flex;
    align-items: stretch;
    flex-wrap: wrap;
    min-height: 52px;
    padding: 4px 2px;
    gap: 0;
    overflow-x: auto;
  }

  .rib-strip::-webkit-scrollbar { height: 0; }

  .rib-group {
    display: flex;
    flex-direction: column;
    padding: 0 4px;
    border-right: 1px solid #e8e4dc;
  }

  .rib-group:last-child { border-right: none; }

  .rib-group-items {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px;
    flex: 1;
    min-height: 32px;
  }

  .rib-group-label {
    text-align: center;
    font-family: 'Fira Code', monospace;
    font-size: 8px;
    color: #b0aca8;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding-bottom: 2px;
    color: #c0bbb5;
  }

  .rib-btn {
    min-width: 26px;
    height: 26px;
    padding: 0 4px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    background: transparent;
    border: 1px solid transparent;
    color: #3a3530;
    font-family: 'Fira Code', monospace;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.1s;
    flex-shrink: 0;
  }

  .rib-btn:hover:not(:disabled) {
    background: #e8e4dc;
    border-color: #d8d4cc;
  }

  .rib-btn.active,
  .rib-btn.ribbon-btn.active {
    background: rgba(232,180,41,0.18) !important;
    border-color: rgba(232,180,41,0.5) !important;
    color: #a07800 !important;
  }

  .rib-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .rib-sep {
    width: 1px;
    background: #e0dcd4;
    align-self: stretch;
    margin: 3px 2px;
    flex-shrink: 0;
  }

  .rib-select {
    height: 26px;
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    color: #3a3530;
    background: #fff;
    border: 1px solid #d8d4cc;
    padding: 0 4px;
    cursor: pointer;
    outline: none;
  }

  .rib-select:focus { border-color: #e8b429; }

  .rib-input {
    height: 26px;
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    color: #3a3530;
    background: #fff;
    border: 1px solid #d8d4cc;
    padding: 0 6px;
    outline: none;
  }

  .rib-input:focus { border-color: #e8b429; }

  .rib-badge {
    padding: 2px 6px;
    background: rgba(232,180,41,0.15);
    border: 1px solid rgba(232,180,41,0.3);
    color: #a07800;
    font-family: 'Fira Code', monospace;
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .rib-color-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 22px;
    height: 26px;
    padding: 0 3px;
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.1s;
    gap: 0;
  }

  .rib-color-btn:hover { background: #e8e4dc; border-color: #d8d4cc; }

  .rib-color-label {
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    font-weight: 500;
    line-height: 1.4;
  }

  .rib-color-bar {
    width: 16px;
    height: 3px;
    margin-top: 1px;
  }

  .rib-color-popup {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 50;
    background: #faf8f4;
    border: 1px solid #d8d4cc;
    box-shadow: 4px 4px 0 rgba(14,14,15,0.12);
    padding: 8px;
    min-width: 120px;
  }

  .rib-swatch {
    width: 16px;
    height: 16px;
    border: 1px solid #d8d4cc;
    cursor: pointer;
    transition: transform 0.08s;
    flex-shrink: 0;
  }

  .rib-swatch:hover { transform: scale(1.15); }
  .rib-swatch.active { outline: 2px solid #e8b429; outline-offset: 1px; }

  .rib-style-pill {
    padding: 3px 8px;
    border: 1px solid #e0dcd4;
    background: #fff;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.1s;
    white-space: nowrap;
  }

  .rib-style-pill:hover { border-color: #0e0e0f; background: #0e0e0f; color: #f5f2eb !important; }
`;

// ── Sub-components ────────────────────────────────────────────────────────
function Btn({ title, children, active, onClick, disabled, className='' }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rib-btn ribbon-btn ${active ? 'active' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

function Sep() { return <div className="rib-sep" />; }

function RibbonGroup({ label, children }) {
  return (
    <div className="rib-group">
      <div className="rib-group-items">{children}</div>
      <div className="rib-group-label">{label}</div>
    </div>
  );
}

function ComingSoonBadge() {
  return <span className="rib-badge">Soon</span>;
}

function ColorSwatch({ color, active, onClick }) {
  return (
    <button
      onClick={() => onClick(color)}
      title={color}
      className={`rib-swatch ${active ? 'active' : ''}`}
      style={{
        background: color === 'none' ? 'transparent' : color,
        backgroundImage: color === 'none' ? 'repeating-linear-gradient(45deg,#ccc 0,#ccc 2px,transparent 0,transparent 50%)' : undefined,
      }}
    />
  );
}

function ColorPicker({ color, colors, label, onPick, onCustom }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="rib-color-btn">
        <span className="rib-color-label" style={{ color: color === 'none' ? '#000' : color }}>{label}</span>
        <div
          className="rib-color-bar"
          style={{
            background: color === 'none' ? 'transparent' : color,
            backgroundImage: color === 'none' ? 'repeating-linear-gradient(45deg,#ccc 0,#ccc 1px,transparent 0,transparent 4px)' : undefined,
          }}
        />
      </button>
      {open && (
        <div className="rib-color-popup" onMouseDown={e => e.preventDefault()}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, marginBottom: 6 }}>
            {colors.map(c => <ColorSwatch key={c} color={c} active={color === c} onClick={v => { onPick(v); setOpen(false); }} />)}
          </div>
          {onCustom && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 9, color: '#888', fontFamily: 'Fira Code, monospace', textTransform: 'uppercase', letterSpacing: 1 }}>Custom</span>
              <input type="color" value={color === 'none' ? '#ffffff' : color}
                onChange={e => onCustom(e.target.value)}
                style={{ width: 28, height: 18, cursor: 'pointer', border: 'none', padding: 0 }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Home Tab ──────────────────────────────────────────────────────────────
function HomeTab({ p }) {
  const sel = p.selectionState || {};
  const namedStyles = p.namedStyles || {};

  return (
    <>
      <RibbonGroup label="Undo">
        <Btn title="Undo (Ctrl+Z)" disabled={!p.canUndo} onClick={p.onUndo}>↩</Btn>
        <Btn title="Redo (Ctrl+Y)" disabled={!p.canRedo} onClick={p.onRedo}>↪</Btn>
      </RibbonGroup>
      <RibbonGroup label="Font">
        <select value={sel.fontFamily || p.fontFamily} onChange={e => p.onSetFontFamily(e.target.value)}
          className="rib-select" style={{ maxWidth: 110 }}>
          {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
        </select>
        <select value={sel.fontSize || p.fontSize} onChange={e => p.onSetFontSize(e.target.value)}
          className="rib-select" style={{ width: 52 }}>
          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </RibbonGroup>
      <RibbonGroup label="Format">
        <Btn title="Bold (Ctrl+B)" active={!!sel.bold} className={`ribbon-btn ${sel.bold ? 'active' : ''}`} onClick={() => p.onExec('bold')}>        <b>B</b></Btn>
        <Btn title="Italic (Ctrl+I)" active={!!sel.italic} className={`ribbon-btn ${sel.italic ? 'active' : ''}`} onClick={() => p.onExec('italic')}>      <i>I</i></Btn>
        <Btn title="Underline (Ctrl+U)" active={!!sel.underline} className={`ribbon-btn ${sel.underline ? 'active' : ''}`} onClick={() => p.onExec('underline')}>   <u>U</u></Btn>
        <Btn title="Strikethrough" active={!!sel.strikethrough} className={`ribbon-btn ${sel.strikethrough ? 'active' : ''}`} onClick={() => p.onExec('strikeThrough')}><s>S</s></Btn>
        <Sep />
        <ColorPicker color={p.textColor}      colors={T_COLORS} label="A" onPick={p.onSetTextColor}    onCustom={p.onSetTextColor}   />
        <ColorPicker color={p.highlightColor} colors={H_COLORS} label="ab" onPick={p.onSetHighlight}  />
        <Btn title="Clear formatting"     onClick={() => p.onExec('removeFormat')}>🚫</Btn>
      </RibbonGroup>
      <RibbonGroup label="Style">
        <select onChange={e => p.onApplyHeading(e.target.value)} value={sel.heading || 'p'}
          className="rib-select" style={{ width: 108 }}>
          {HEADINGS.map(h => <option key={h.v} value={h.v}>{h.label}</option>)}
        </select>
      </RibbonGroup>
      <RibbonGroup label="Paragraph">
        <Btn title="Align Left"    onClick={() => p.onExec('justifyLeft')}>   ≡L</Btn>
        <Btn title="Center"        onClick={() => p.onExec('justifyCenter')}> ≡C</Btn>
        <Btn title="Align Right"   onClick={() => p.onExec('justifyRight')}>  ≡R</Btn>
        <Btn title="Justify"       onClick={() => p.onExec('justifyFull')}>   ≡J</Btn>
        <Sep />
        <Btn title="Bullet list"    onClick={() => p.onExec('insertUnorderedList')}>• ≡</Btn>
        <Btn title="Numbered list"  onClick={() => p.onExec('insertOrderedList')}>1≡</Btn>
        <Btn title="Indent"         onClick={() => p.onExec('indent')}>  →≡</Btn>
        <Btn title="Outdent"        onClick={() => p.onExec('outdent')}> ←≡</Btn>
      </RibbonGroup>
      <RibbonGroup label="Editing">
        <Btn title="Find & Replace (Ctrl+F)" onClick={p.onShowFindReplace}>🔍</Btn>
        <Btn title="Format Painter" active={!!p.formatPainterActive} className={`ribbon-btn ${p.formatPainterActive ? 'active' : ''}`} onClick={p.onActivateFormatPainter}>🖌</Btn>
      </RibbonGroup>
      <RibbonGroup label="Styles Gallery">
        <div className="flex gap-1 overflow-x-auto" style={{ maxWidth: 320 }}>
          {Object.keys(namedStyles).map(name => (
            <button
              key={name}
              onClick={() => p.onApplyStyle(name)}
              className="rib-style-pill"
              style={{
                fontFamily: namedStyles[name].fontFamily,
                fontWeight: namedStyles[name].fontWeight,
                color: namedStyles[name].color,
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </RibbonGroup>
    </>
  );
}

// ── Insert Tab ────────────────────────────────────────────────────────────
function InsertTab({ p }) {
  return (
    <>
      <RibbonGroup label="Tables">
        <Btn title="Insert Table" onClick={p.onShowTable} className="gap-1"><span>▦</span><span className="text-xs">Table</span></Btn>
      </RibbonGroup>
      <RibbonGroup label="Images">
        <Btn title="Insert Image" onClick={p.onShowImage} className="gap-1"><span>🖼</span><span className="text-xs">Image</span></Btn>
      </RibbonGroup>
      <RibbonGroup label="Links">
        <Btn title="Insert Link" onClick={p.onShowLink} className="gap-1"><span>🔗</span><span className="text-xs">Link</span></Btn>
        <Btn title="Remove Link" onClick={() => p.onExec('unlink')} className="gap-1"><span>⛓️‍💥</span><span className="text-xs">Unlink</span></Btn>
      </RibbonGroup>
      <RibbonGroup label="Elements">
        <Btn title="Horizontal Rule"  onClick={p.onInsertHR}         className="gap-1">— <span className="text-xs">Rule</span></Btn>
        <Btn title="Page Break"       onClick={p.onInsertPageBreak}  className="gap-1">⏎ <span className="text-xs">Break</span></Btn>
        <Btn title="Insert Footnote"  onClick={p.onInsertFootnote}   className="gap-1">¹ <span className="text-xs">Footnote</span></Btn>
        <Btn title="Table of Contents"onClick={p.onInsertTOC}        className="gap-1">📑 <span className="text-xs">TOC</span></Btn>
        <Btn title="Insert Symbol" onClick={p.onShowSymbols} className="gap-1">Ω <span className="text-xs">Symbol</span></Btn>
        <Btn title="Toggle Header & Footer" onClick={p.onToggleHeaderFooter} className="gap-1">↕ <span className="text-xs">Header/Footer</span></Btn>
        <Btn title="Insert Page Number" onClick={p.onInsertPageNumber} className="gap-1"># <span className="text-xs">Page Num</span></Btn>
      </RibbonGroup>
      <RibbonGroup label="Import">
        <Btn title="Import .docx file" onClick={p.onImportDocx}      className="gap-1"><span>📂</span><span className="text-xs">.docx</span></Btn>
        <Btn title="Import .txt file"  onClick={p.onImportTxt}       className="gap-1"><span>📄</span><span className="text-xs">.txt</span></Btn>
      </RibbonGroup>
      <RibbonGroup label="Export">
        <Btn title="Export as .docx"  onClick={p.onExportDocx}  className="gap-1"><span>💾</span><span className="text-xs">.docx</span></Btn>
        <Btn title="Export as .pdf"   onClick={p.onExportPdf}   className="gap-1"><span>📕</span><span className="text-xs">.pdf</span></Btn>
        <Btn title="Export as .html"  onClick={p.onExportHTML}  className="gap-1"><span>🌐</span><span className="text-xs">.html</span></Btn>
        <Btn title="Export as .txt"   onClick={p.onExportTxt}   className="gap-1"><span>📝</span><span className="text-xs">.txt</span></Btn>
        <Btn title="Print"            onClick={p.onPrint}       className="gap-1"><span>🖨</span><span className="text-xs">Print</span></Btn>
      </RibbonGroup>
    </>
  );
}

// ── Layout Tab ────────────────────────────────────────────────────────────
function LayoutTab({ p }) {
  return (
    <>
      <RibbonGroup label="Page Size">
        {['A4','Letter','Legal'].map(s => (
          <Btn key={s} title={`Page size: ${s}`} active={p.pageSize === s} onClick={() => p.onSetPageSize(s)} className="px-2 text-xs">{s}</Btn>
        ))}
      </RibbonGroup>
      <RibbonGroup label="Margins">
        {[['Normal','normal'],['Narrow','narrow'],['Wide','wide']].map(([l,v]) => (
          <Btn key={v} title={`Margins: ${l}`} active={p.margins === v} onClick={() => p.onSetMargins(v)} className="px-2 text-xs">{l}</Btn>
        ))}
      </RibbonGroup>
      <RibbonGroup label="Spacing">
        <select value={p.lineSpacing} onChange={e => p.onSetLineSpacing(e.target.value)}
          className="rib-select">
          {[['1.0','Single'],['1.15','1.15'],['1.5','1.5x'],['2.0','Double'],['2.5','2.5x'],['3.0','Triple']].map(([v,l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </RibbonGroup>
      <RibbonGroup label="Page Numbers">
        <Btn title="Toggle page numbers" active={p.showPageNumbers} onClick={p.onTogglePageNumbers} className="gap-1">
          <span>#</span><span className="text-xs">Page Nums</span>
        </Btn>
      </RibbonGroup>
    </>
  );
}

// ── Review Tab ────────────────────────────────────────────────────────────
function ReviewTab({ p }) {
  return (
    <>
      <RibbonGroup label="Track Changes">
        <Btn title="Toggle Track Changes" active={p.trackChanges} onClick={p.onToggleTrackChanges} className="gap-1 px-2">
          <span>✏️</span><span className="text-xs">{p.trackChanges ? 'TC: On' : 'TC: Off'}</span>
        </Btn>
        <Btn title="Accept all changes" onClick={p.onAcceptAll} className="gap-1 px-1 text-xs">✓ All</Btn>
        <Btn title="Reject all changes" onClick={p.onRejectAll} className="gap-1 px-1 text-xs">✗ All</Btn>
      </RibbonGroup>
      <RibbonGroup label="Comments">
        <Btn title="Show Comments panel" active={p.showComments} onClick={p.onShowComments} className="gap-1">
          <span>💬</span><span className="text-xs">Comments</span>
        </Btn>
      </RibbonGroup>
      <RibbonGroup label="Check">
        <Btn title="Word Count" onClick={p.onShowWordCount} className="gap-1">
          <span>📊</span><span className="text-xs">Word Count</span>
        </Btn>
      </RibbonGroup>
      <RibbonGroup label="History">
        <Btn title="Version History" active={p.showVersionHistory} onClick={p.onShowVersionHistory} className="gap-1">
          <span>🕐</span><span className="text-xs">History</span>
        </Btn>
      </RibbonGroup>
      <RibbonGroup label="Find">
        <Btn title="Find & Replace (Ctrl+F)" onClick={p.onShowFindReplace} className="gap-1">
          <span>🔍</span><span className="text-xs">Find & Replace</span>
        </Btn>
      </RibbonGroup>
    </>
  );
}

// ── View Tab ──────────────────────────────────────────────────────────────
function ViewTab({ p }) {
  return (
    <>
      <RibbonGroup label="Zoom">
        <Btn title="Zoom out"      onClick={() => p.onSetZoom(Math.max(25, p.zoom - 10))}>−</Btn>
        <select value={p.zoom} onChange={e => p.onSetZoom(+e.target.value)}
          className="rib-select" style={{ width: 62 }}>
          {[25,50,75,100,125,150,175,200].map(z => <option key={z} value={z}>{z}%</option>)}
        </select>
        <Btn title="Zoom in"       onClick={() => p.onSetZoom(Math.min(200, p.zoom + 10))}>+</Btn>
      </RibbonGroup>
      <RibbonGroup label="Show">
        <Btn title="Toggle ruler" active={p.showRuler} onClick={p.onToggleRuler} className="gap-1">
          <span>📐</span><span className="text-xs">Ruler</span>
        </Btn>
      </RibbonGroup>
      <RibbonGroup label="Color">
        <Btn title="Toggle dark mode" active={p.darkMode} onClick={p.onToggleDarkMode} className="gap-1">
          <span>{p.darkMode ? '☀️' : '🌙'}</span><span className="text-xs">{p.darkMode ? 'Light' : 'Dark'}</span>
        </Btn>
      </RibbonGroup>
      <RibbonGroup label="Focus">
        <Btn title="Focus / distraction-free mode" active={p.focusMode} onClick={p.onToggleFocusMode} className="gap-1">
          <span>⛶</span><span className="text-xs">Focus Mode</span>
        </Btn>
      </RibbonGroup>
    </>
  );
}

// ── Draw Tab ──────────────────────────────────────────────────────────────
function DrawTab({ p }) {
  return (
    <>
      <RibbonGroup label="Tools">
        <Btn title="Pen tool" active={p.drawMode} onClick={p.onToggleDrawMode} className="gap-1 px-2">
          <span>✏️</span><span className="text-xs">{p.drawMode ? 'Pen On' : 'Pen'}</span>
        </Btn>
        <Btn title="Apply highlight color" onClick={() => p.onExec('hiliteColor', p.highlightColor === 'none' ? '#ffff00' : p.highlightColor)} className="gap-1 px-2">
          <span>🖍</span><span className="text-xs">Highlighter</span>
        </Btn>
        <Btn title="Clear formatting" onClick={() => p.onExec('removeFormat')} className="gap-1 px-2">
          <span>🧽</span><span className="text-xs">Eraser</span>
        </Btn>
      </RibbonGroup>
      <RibbonGroup label="Ink">
        <div className="flex items-center gap-2 px-2">
          <ComingSoonBadge />
          <span className="text-[10px] text-gray-500 max-w-[150px]">Freehand drawing tools will land in a later version.</span>
        </div>
      </RibbonGroup>
    </>
  );
}

// ── Design Tab ────────────────────────────────────────────────────────────
function DesignTab({ p }) {
  return (
    <>
      <RibbonGroup label="Page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px' }}>
          <label style={{ fontSize: 9, color: '#888', fontFamily: 'Fira Code, monospace', textTransform: 'uppercase', letterSpacing: 1 }}>Color</label>
          <input
            type="color"
            value={p.pageColor}
            onChange={e => p.onSetPageColor(e.target.value)}
            style={{ width: 28, height: 22, cursor: 'pointer', border: '1px solid #d8d4cc', padding: 0 }}
            title="Page color"
          />
        </div>
        <Btn title="Toggle page border" active={p.pageBorder} onClick={p.onTogglePageBorder} className="gap-1 px-2">
          <span>▣</span><span className="text-xs">Border</span>
        </Btn>
      </RibbonGroup>
      <RibbonGroup label="Watermark">
        <input
          value={p.watermarkText}
          onChange={e => p.onSetWatermarkText(e.target.value)}
          placeholder="Watermark text"
          className="rib-input" style={{ width: 130 }}
        />
      </RibbonGroup>
      <RibbonGroup label="Font Theme">
        {[
          ['default', 'Default'],
          ['classic', 'Classic'],
          ['modern', 'Modern'],
        ].map(([key, label]) => (
          <Btn key={key} title={`${label} font theme`} active={p.fontTheme === key} onClick={() => p.onApplyFontTheme(key)} className="px-2 text-xs">
            {label}
          </Btn>
        ))}
      </RibbonGroup>
      <RibbonGroup label="Color Theme">
        {[
          ['default', 'Default'],
          ['dark', 'Dark'],
          ['sepia', 'Sepia'],
        ].map(([key, label]) => (
          <Btn key={key} title={`${label} color theme`} active={p.colorTheme === key} onClick={() => p.onApplyColorTheme(key)} className="px-2 text-xs">
            {label}
          </Btn>
        ))}
      </RibbonGroup>
    </>
  );
}

// ── References Tab ────────────────────────────────────────────────────────
function ReferencesTab({ p }) {
  return (
    <>
      <RibbonGroup label="References">
        <Btn title="Insert Footnote" onClick={p.onInsertFootnote} className="gap-1 px-2">
          <span>¹</span><span className="text-xs">Footnote</span>
        </Btn>
        <Btn title="Insert Table of Contents" onClick={p.onInsertTOC} className="gap-1 px-2">
          <span>📑</span><span className="text-xs">TOC</span>
        </Btn>
        <Btn title="Insert Caption" onClick={p.onInsertCaption} className="gap-1 px-2">
          <span>🏷</span><span className="text-xs">Caption</span>
        </Btn>
        <Btn title="Word Count" onClick={p.onShowWordCount} className="gap-1 px-2">
          <span>📊</span><span className="text-xs">Word Count</span>
        </Btn>
      </RibbonGroup>
    </>
  );
}

// ── Mailings Tab ──────────────────────────────────────────────────────────
function MailingsTab() {
  return (
    <>
      <RibbonGroup label="Mail Merge">
        <Btn title="Start Mail Merge" disabled className="gap-1 px-2">
          <span>✉️</span><span className="text-xs">Start Merge</span>
        </Btn>
        <Btn title="Select Recipients" disabled className="gap-1 px-2">
          <span>👥</span><span className="text-xs">Recipients</span>
        </Btn>
        <div style={{ padding: '4px 8px', background: '#f0ede6', color: '#b0aca8', fontSize: 10, border: '1px solid #e0dcd4', fontFamily: 'Fira Code, monospace' }}>
          Mail merge · not available in this version
        </div>
      </RibbonGroup>
    </>
  );
}

// ── Main Ribbon ───────────────────────────────────────────────────────────
export default function Ribbon(props) {
  const {
    activeTab, onTabChange,
    showComments, showVersionHistory,
    trackChanges,
  } = props;

  return (
    <>
      <style>{RIBBON_CSS}</style>
      <div className="no-print rib-root">
        {/* Tab bar */}
        <div className="rib-tabs">
          {TABS.map(tab => {
            const key = tab.toLowerCase();
            const isActive = activeTab === key;
            return (
              <button key={tab} onClick={() => onTabChange(key)} className={`rib-tab ${isActive ? 'active' : ''}`}>
                {tab}
              </button>
            );
          })}
        </div>

        {/* Command strip */}
        <div className="rib-strip">
          {activeTab === 'home'       && <HomeTab       p={props} />}
          {activeTab === 'insert'     && <InsertTab     p={props} />}
          {activeTab === 'layout'     && <LayoutTab     p={props} />}
          {activeTab === 'review'     && <ReviewTab     p={{ ...props, showComments, showVersionHistory, trackChanges }} />}
          {activeTab === 'view'       && <ViewTab       p={props} />}
          {activeTab === 'draw'       && <DrawTab       p={props} />}
          {activeTab === 'design'     && <DesignTab     p={props} />}
          {activeTab === 'references' && <ReferencesTab p={props} />}
          {activeTab === 'mailings'   && <MailingsTab />}
        </div>
      </div>
    </>
  );
}
