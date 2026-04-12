import { useState, useRef, useEffect, useCallback } from 'react';

export default function FindReplaceModal({ editorRef, onClose }) {
  const [findText,    setFindText]    = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase,   setMatchCase]   = useState(false);
  const [matchCount,  setMatchCount]  = useState(0);
  const [currentIdx,  setCurrentIdx]  = useState(0);
  const matchesRef = useRef([]);

  const clearHighlights = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.querySelectorAll('.search-highlight').forEach(el => {
      el.replaceWith(...el.childNodes);
    });
    editor.normalize();
  }, [editorRef]);

  const highlight = useCallback((term) => {
    clearHighlights();
    if (!term || !editorRef.current) return 0;

    const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
    const nodes  = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);

    const flags = matchCase ? 'g' : 'gi';
    const re    = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    let count   = 0;
    const spans = [];

    nodes.forEach(textNode => {
      const text = textNode.nodeValue;
      const matches = [...text.matchAll(re)];
      if (!matches.length) return;

      const frag = document.createDocumentFragment();
      let last   = 0;
      matches.forEach(m => {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const span = document.createElement('span');
        span.className = 'search-highlight';
        span.textContent = m[0];
        frag.appendChild(span);
        spans.push(span);
        count++;
        last = m.index + m[0].length;
      });
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      textNode.parentNode.replaceChild(frag, textNode);
    });

    matchesRef.current = spans;
    return count;
  }, [clearHighlights, matchCase, editorRef]);

  const activateMatch = useCallback((idx) => {
    matchesRef.current.forEach((s, i) => {
      s.classList.toggle('active', i === idx);
    });
    matchesRef.current[idx]?.scrollIntoView({ block: 'center' });
  }, []);

  const runFind = useCallback(() => {
    const count = highlight(findText);
    setMatchCount(count);
    const idx = count > 0 ? 0 : -1;
    setCurrentIdx(idx < 0 ? 0 : idx);
    if (count > 0) activateMatch(0);
  }, [findText, highlight, activateMatch]);

  useEffect(() => { if (findText) runFind(); else clearHighlights(); }, [findText, matchCase]); // eslint-disable-line
  useEffect(() => () => clearHighlights(), [clearHighlights]);

  const findNext = () => {
    if (!matchesRef.current.length) return runFind();
    const next = (currentIdx + 1) % matchesRef.current.length;
    setCurrentIdx(next);
    activateMatch(next);
  };

  const findPrev = () => {
    if (!matchesRef.current.length) return;
    const prev = (currentIdx - 1 + matchesRef.current.length) % matchesRef.current.length;
    setCurrentIdx(prev);
    activateMatch(prev);
  };

  const replaceCurrent = () => {
    const spans = matchesRef.current;
    if (!spans.length) return;
    const span = spans[currentIdx];
    if (!span) return;
    span.replaceWith(document.createTextNode(replaceText));
    matchesRef.current.splice(currentIdx, 1);
    setMatchCount(c => c - 1);
    const next = Math.min(currentIdx, matchesRef.current.length - 1);
    setCurrentIdx(next >= 0 ? next : 0);
    if (next >= 0) activateMatch(next);
  };

  const replaceAll = () => {
    matchesRef.current.forEach(span => span.replaceWith(document.createTextNode(replaceText)));
    matchesRef.current = [];
    setMatchCount(0);
    setCurrentIdx(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Find & Replace</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Find</label>
            <div className="flex gap-2">
              <input
                autoFocus
                value={findText}
                onChange={e => setFindText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && findNext()}
                placeholder="Search text…"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2b579a]"
              />
              <span className="self-center text-xs text-gray-400 whitespace-nowrap">
                {matchCount > 0 ? `${currentIdx + 1} / ${matchCount}` : matchCount === 0 && findText ? 'Not found' : ''}
              </span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Replace with</label>
            <input
              value={replaceText}
              onChange={e => setReplaceText(e.target.value)}
              placeholder="Replacement text…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2b579a]"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={matchCase} onChange={e => setMatchCase(e.target.checked)} className="rounded" />
            Match case
          </label>
        </div>
        <div className="px-5 pb-5 flex flex-wrap gap-2">
          <button onClick={findPrev}       className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">◂ Prev</button>
          <button onClick={findNext}       className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Next ▸</button>
          <button onClick={replaceCurrent} className="px-3 py-1.5 text-sm bg-[#2b579a] text-white rounded-lg hover:bg-[#1e3f73]">Replace</button>
          <button onClick={replaceAll}     className="px-3 py-1.5 text-sm bg-[#2b579a] text-white rounded-lg hover:bg-[#1e3f73]">Replace All</button>
          <button onClick={onClose}        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 ml-auto">Close</button>
        </div>
      </div>
    </div>
  );
}
