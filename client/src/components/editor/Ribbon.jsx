import { useState, useRef, useEffect } from 'react';

const FONTS = ['Calibri','Arial','Arial Black','Times New Roman','Georgia','Verdana','Trebuchet MS','Courier New','Garamond','Palatino Linotype','Comic Sans MS','Impact'];
const SIZES = [8,9,10,11,12,14,16,18,20,24,28,32,36,48,60,72];
const HEADINGS = [{ label:'Normal', v:'p' },{ label:'Heading 1', v:'h1' },{ label:'Heading 2', v:'h2' },{ label:'Heading 3', v:'h3' },{ label:'Heading 4', v:'h4' }];
const T_COLORS  = ['#000000','#444444','#888888','#cccccc','#ffffff','#c0392b','#e67e22','#f1c40f','#27ae60','#2980b9','#8e44ad','#16a085','#d35400','#2c3e50','#7f8c8d','#e74c3c','#3498db','#2ecc71','#9b59b6','#2b579a'];
const H_COLORS  = ['#ffff00','#00ff00','#00ffff','#ff69b4','#ff6600','#9900cc','#ffffff','#ff0000','#0000ff','#808080','none'];
const TABS      = ['Home','Insert','Layout','Review','View'];

// ── Sub-components ────────────────────────────────────────────────────────
function Btn({ title, children, active, onClick, disabled, className='' }) {
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      className={`min-w-[26px] h-7 px-1 flex items-center justify-center rounded text-sm gap-0.5 select-none
        ${active ? 'bg-[#dce6f7] text-[#2b579a] border border-[#7fb3e8]' : 'text-gray-700 hover:bg-gray-200'}
        disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${className}`}>
      {children}
    </button>
  );
}

function Sep() { return <div className="w-px bg-gray-300 mx-0.5 self-stretch my-0.5" />; }

function RibbonGroup({ label, children }) {
  return (
    <div className="flex flex-col px-1 border-r border-gray-200 last:border-0">
      <div className="flex items-center flex-wrap gap-0.5 flex-1 min-h-[32px]">{children}</div>
      <div className="text-center text-[9px] text-gray-400 leading-tight pb-0.5">{label}</div>
    </div>
  );
}

function ColorSwatch({ color, active, onClick }) {
  return (
    <button onClick={() => onClick(color)} title={color}
      className={`w-4 h-4 rounded-sm border hover:scale-110 transition-transform flex-shrink-0 ${active ? 'ring-1 ring-[#2b579a]' : 'border-gray-300'}`}
      style={{ background: color === 'none' ? 'transparent' : color, backgroundImage: color === 'none' ? 'repeating-linear-gradient(45deg,#ccc 0,#ccc 2px,transparent 0,transparent 50%)' : undefined }} />
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
      <button onClick={() => setOpen(o => !o)}
        className="flex flex-col items-center min-w-[24px] h-7 px-1 rounded text-sm text-gray-700 hover:bg-gray-200 select-none">
        <span className="font-bold leading-tight" style={{ color: color === 'none' ? '#000' : color }}>{label}</span>
        <div className="w-4 h-1.5 rounded-sm mt-0.5" style={{ background: color === 'none' ? 'transparent' : color, backgroundImage: color === 'none' ? 'repeating-linear-gradient(45deg,#ccc 0,#ccc 1px,transparent 0,transparent 4px)' : undefined }} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 bg-white border border-gray-300 shadow-xl rounded p-2 min-w-[120px]"
          onMouseDown={e => e.preventDefault()}>
          <div className="grid grid-cols-5 gap-0.5 mb-1.5">
            {colors.map(c => <ColorSwatch key={c} color={c} active={color === c} onClick={v => { onPick(v); setOpen(false); }} />)}
          </div>
          {onCustom && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500">Custom:</span>
              <input type="color" value={color === 'none' ? '#ffffff' : color}
                onChange={e => onCustom(e.target.value)}
                className="w-8 h-5 cursor-pointer rounded border-0 p-0" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Home Tab ──────────────────────────────────────────────────────────────
function HomeTab({ p }) {
  return (
    <>
      <RibbonGroup label="Undo">
        <Btn title="Undo (Ctrl+Z)" disabled={!p.canUndo} onClick={p.onUndo}>↩</Btn>
        <Btn title="Redo (Ctrl+Y)" disabled={!p.canRedo} onClick={p.onRedo}>↪</Btn>
      </RibbonGroup>
      <RibbonGroup label="Font">
        <select value={p.fontFamily} onChange={e => p.onSetFontFamily(e.target.value)}
          className="h-7 text-xs border border-gray-300 rounded px-1 focus:outline-none focus:ring-1 focus:ring-[#2b579a] max-w-[110px]">
          {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
        </select>
        <select value={p.fontSize} onChange={e => p.onSetFontSize(e.target.value)}
          className="h-7 text-xs border border-gray-300 rounded px-1 focus:outline-none focus:ring-1 focus:ring-[#2b579a] w-14">
          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </RibbonGroup>
      <RibbonGroup label="Format">
        <Btn title="Bold (Ctrl+B)"        onClick={() => p.onExec('bold')}>        <b>B</b></Btn>
        <Btn title="Italic (Ctrl+I)"      onClick={() => p.onExec('italic')}>      <i>I</i></Btn>
        <Btn title="Underline (Ctrl+U)"   onClick={() => p.onExec('underline')}>   <u>U</u></Btn>
        <Btn title="Strikethrough"        onClick={() => p.onExec('strikeThrough')}><s>S</s></Btn>
        <Sep />
        <ColorPicker color={p.textColor}      colors={T_COLORS} label="A" onPick={p.onSetTextColor}    onCustom={p.onSetTextColor}   />
        <ColorPicker color={p.highlightColor} colors={H_COLORS} label="ab" onPick={p.onSetHighlight}  />
        <Btn title="Clear formatting"     onClick={() => p.onExec('removeFormat')}>🚫</Btn>
      </RibbonGroup>
      <RibbonGroup label="Style">
        <select onChange={e => p.onApplyHeading(e.target.value)} defaultValue="p"
          className="h-7 text-xs border border-gray-300 rounded px-1 focus:outline-none focus:ring-1 focus:ring-[#2b579a] w-28">
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
      </RibbonGroup>
      <RibbonGroup label="Import">
        <Btn title="Import .docx file" onClick={p.onImportDocx}      className="gap-1"><span>📂</span><span className="text-xs">.docx</span></Btn>
        <Btn title="Import .txt file"  onClick={p.onImportTxt}       className="gap-1"><span>📄</span><span className="text-xs">.txt</span></Btn>
      </RibbonGroup>
      <RibbonGroup label="Export">
        <Btn title="Export as .docx"  onClick={p.onExportDocx}  className="gap-1"><span>💾</span><span className="text-xs">.docx</span></Btn>
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
          className="h-7 text-xs border border-gray-300 rounded px-1 focus:outline-none focus:ring-1 focus:ring-[#2b579a]">
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
          className="h-7 text-xs border border-gray-300 rounded px-1 focus:outline-none focus:ring-1 focus:ring-[#2b579a] w-16">
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

// ── Main Ribbon ───────────────────────────────────────────────────────────
export default function Ribbon(props) {
  const {
    activeTab, onTabChange,
    showComments, showVersionHistory,
    trackChanges,
  } = props;

  return (
    <div className="no-print bg-white border-b border-gray-300 flex-shrink-0 select-none">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-2">
        {TABS.map(tab => {
          const key = tab.toLowerCase();
          const isActive = activeTab === key;
          return (
            <button key={tab} onClick={() => onTabChange(key)}
              className={`px-4 py-1.5 text-xs font-medium rounded-t transition-colors ${
                isActive
                  ? 'text-[#2b579a] border-b-2 border-[#2b579a] bg-[#dce6f7]/40'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}>
              {tab}
            </button>
          );
        })}
      </div>

      {/* Command strip */}
      <div className="flex items-stretch flex-wrap gap-0 px-1 py-1 min-h-[56px]">
        {activeTab === 'home'   && <HomeTab   p={props} />}
        {activeTab === 'insert' && <InsertTab p={props} />}
        {activeTab === 'layout' && <LayoutTab p={props} />}
        {activeTab === 'review' && <ReviewTab p={{ ...props, showComments, showVersionHistory, trackChanges }} />}
        {activeTab === 'view'   && <ViewTab   p={props} />}
      </div>
    </div>
  );
}
