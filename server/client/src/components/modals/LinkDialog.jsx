import { useState, useEffect } from 'react';

export default function LinkDialog({ editorRef, savedRangeRef, onInsert, onClose }) {
  const [url,    setUrl]    = useState('https://');
  const [text,   setText]   = useState('');
  const [newTab, setNewTab] = useState(true);

  useEffect(() => {
    // Pre-fill with selected text
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) setText(sel.toString());
    // Check if selection is already a link
    if (savedRangeRef?.current) {
      const el = savedRangeRef.current.commonAncestorContainer?.parentElement;
      if (el?.tagName === 'A') {
        setUrl(el.href);
        setText(el.textContent);
      }
    }
  }, []); // eslint-disable-line

  const handleInsert = () => {
    if (!url || url === 'https://') return;
    onInsert(url, text, newTab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-80 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Insert Link</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">URL</label>
            <input autoFocus value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2b579a]"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Display text</label>
            <input value={text} onChange={e => setText(e.target.value)}
              placeholder="Link text (leave blank to use URL)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2b579a]"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={newTab} onChange={e => setNewTab(e.target.checked)} className="rounded" />
            Open in new tab
          </label>
        </div>
        <div className="px-5 pb-5 flex justify-end gap-2">
          <button onClick={onClose}    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleInsert} className="px-4 py-2 text-sm bg-[#2b579a] text-white rounded-lg hover:bg-[#1e3f73]">Insert Link</button>
        </div>
      </div>
    </div>
  );
}
