import { useRef, useState, useCallback } from 'react';

const MAX_HISTORY = 50;

export default function useEditor() {
  const editorRef       = useRef(null);
  const savedRangeRef   = useRef(null);
  const historyRef      = useRef([]);
  const historyIndexRef = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // ── History management ───────────────────────────────────────────────────
  const pushHistory = useCallback((html) => {
    const h = historyRef.current;
    const i = historyIndexRef.current;
    // Remove any "future" entries if we branched
    h.splice(i + 1);
    h.push(html);
    if (h.length > MAX_HISTORY) h.shift();
    historyIndexRef.current = h.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    const h = historyRef.current;
    const i = historyIndexRef.current;
    if (i <= 0 || !editorRef.current) return;
    historyIndexRef.current = i - 1;
    editorRef.current.innerHTML = h[historyIndexRef.current];
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
    editorRef.current.dispatchEvent(new Event('input', { bubbles: true }));
  }, []);

  const redo = useCallback(() => {
    const h = historyRef.current;
    const i = historyIndexRef.current;
    if (i >= h.length - 1 || !editorRef.current) return;
    historyIndexRef.current = i + 1;
    editorRef.current.innerHTML = h[historyIndexRef.current];
    setCanUndo(true);
    setCanRedo(historyIndexRef.current < h.length - 1);
    editorRef.current.dispatchEvent(new Event('input', { bubbles: true }));
  }, []);

  // ── Selection management ─────────────────────────────────────────────────
  const saveRange = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
    return savedRangeRef.current;
  }, []);

  const restoreRange = useCallback(() => {
    if (!savedRangeRef.current || !editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  }, []);

  // ── Core exec ────────────────────────────────────────────────────────────
  const exec = useCallback((cmd, value = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    pushHistory(editorRef.current?.innerHTML || '');
  }, [pushHistory]);

  // ── Insert raw HTML at cursor ────────────────────────────────────────────
  const insertHTML = useCallback((html) => {
    restoreRange();
    document.execCommand('insertHTML', false, html);
    pushHistory(editorRef.current?.innerHTML || '');
  }, [restoreRange, pushHistory]);

  // ── Apply heading / paragraph style ──────────────────────────────────────
  const applyHeading = useCallback((tag) => {
    editorRef.current?.focus();
    if (tag === 'p' || tag === 'normal') {
      document.execCommand('formatBlock', false, 'p');
    } else {
      document.execCommand('formatBlock', false, tag);
    }
    pushHistory(editorRef.current?.innerHTML || '');
  }, [pushHistory]);

  // ── Insert table ─────────────────────────────────────────────────────────
  const insertTable = useCallback((rows, cols) => {
    const colWidth = Math.floor(100 / cols);
    let html = '<table><tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        html += `<td style="width:${colWidth}%">&nbsp;</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    insertHTML(html);
  }, [insertHTML]);

  // ── Insert image ─────────────────────────────────────────────────────────
  const insertImage = useCallback((src, alt = '') => {
    insertHTML(`<img src="${src}" alt="${alt}" style="max-width:100%"><p><br></p>`);
  }, [insertHTML]);

  // ── Insert link ──────────────────────────────────────────────────────────
  const insertLink = useCallback((url, text) => {
    restoreRange();
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      exec('createLink', url);
    } else {
      insertHTML(`<a href="${url}" target="_blank">${text || url}</a>`);
    }
  }, [restoreRange, exec, insertHTML]);

  // ── Insert HR ────────────────────────────────────────────────────────────
  const insertHR = useCallback(() => {
    insertHTML('<hr><p><br></p>');
  }, [insertHTML]);

  // ── Insert page break ────────────────────────────────────────────────────
  const insertPageBreak = useCallback(() => {
    insertHTML('<div class="page-break" contenteditable="false"></div><p><br></p>');
  }, [insertHTML]);

  // ── Insert footnote ──────────────────────────────────────────────────────
  const insertFootnote = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const existingRefs = editor.querySelectorAll('sup.fn-ref');
    const num = existingRefs.length + 1;
    const id  = `fn-${num}-${Date.now()}`;

    // Insert superscript reference at cursor
    insertHTML(`<sup class="fn-ref" id="${id}">${num}</sup>`);

    // Ensure footnote area exists
    let fnArea = editor.querySelector('.footnote-area');
    if (!fnArea) {
      fnArea = document.createElement('div');
      fnArea.className = 'footnote-area';
      editor.appendChild(fnArea);
    }
    const item = document.createElement('div');
    item.className = 'fn-item';
    item.setAttribute('data-fn-id', id);
    item.innerHTML = `<sup>${num}</sup> <span contenteditable="true">Footnote text here</span>`;
    fnArea.appendChild(item);
    pushHistory(editor.innerHTML);
  }, [insertHTML, pushHistory]);

  // ── Insert Table of Contents ──────────────────────────────────────────────
  const insertTOC = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const headings = editor.querySelectorAll('h1, h2, h3');
    if (!headings.length) {
      insertHTML('<div class="toc-block"><div class="toc-title">Table of Contents</div><p style="color:#888">No headings found. Add H1/H2/H3 headings first.</p></div>');
      return;
    }
    let items = '';
    headings.forEach((h, i) => {
      const level = h.tagName.toLowerCase();
      const id    = `heading-${i}`;
      h.id = id;
      items += `<div class="${level === 'h1' ? 'toc-h1' : level === 'h2' ? 'toc-h2' : 'toc-h3'}"><a href="#${id}">${h.innerText}</a></div>`;
    });
    insertHTML(`<div class="toc-block"><div class="toc-title">Table of Contents</div>${items}</div><p><br></p>`);
  }, [insertHTML]);

  // ── Word count ────────────────────────────────────────────────────────────
  const getWordCount = useCallback(() => {
    const text = editorRef.current?.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    const paragraphs = (editorRef.current?.querySelectorAll('p, h1, h2, h3, h4, li')?.length) || 0;
    const lines = text.split('\n').filter(l => l.trim()).length;
    return { words, chars, charsNoSpaces, paragraphs, lines };
  }, []);

  const getHTML = useCallback(() => editorRef.current?.innerHTML || '', []);
  const setHTML = useCallback((html) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
      pushHistory(html);
    }
  }, [pushHistory]);

  // ── Input handler ────────────────────────────────────────────────────────
  const handleInput = useCallback(() => {
    // Debounced history push is handled externally by Editor.jsx via onInput
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); exec('bold');          break;
        case 'i': e.preventDefault(); exec('italic');        break;
        case 'u': e.preventDefault(); exec('underline');     break;
        case 'z': e.preventDefault(); e.shiftKey ? redo() : undo(); break;
        case 'y': e.preventDefault(); redo();                break;
        default: break;
      }
    }
  }, [exec, undo, redo]);

  // ── Paste handler (strip external formatting, keep structure) ────────────
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const html  = e.clipboardData.getData('text/html');
    if (html) {
      // Sanitize: strip scripts/styles but keep formatting
      const clean = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      document.execCommand('insertHTML', false, clean);
    } else {
      document.execCommand('insertText', false, text);
    }
    pushHistory(editorRef.current?.innerHTML || '');
  }, [pushHistory]);

  return {
    editorRef,
    savedRangeRef,
    canUndo,
    canRedo,
    pushHistory,
    undo,
    redo,
    saveRange,
    restoreRange,
    exec,
    insertHTML,
    applyHeading,
    insertTable,
    insertImage,
    insertLink,
    insertHR,
    insertPageBreak,
    insertFootnote,
    insertTOC,
    getWordCount,
    getHTML,
    setHTML,
    handleInput,
    handleKeyDown,
    handlePaste,
  };
}
