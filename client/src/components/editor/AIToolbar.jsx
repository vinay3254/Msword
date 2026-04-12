import { useState, useEffect, useRef } from 'react';
import { aiRewrite, aiFixGrammar, aiExpand, aiSummarize, aiTranslate } from '../../api/ai';

const TONES = ['professional', 'casual', 'formal', 'friendly', 'persuasive', 'academic'];
const LANGUAGES = ['Spanish', 'French', 'German', 'Hindi', 'Arabic', 'Chinese', 'Japanese', 'Portuguese'];
const getErrorMessage = (err) => err?.response?.data?.message || err?.message || 'AI request failed.';

export default function AIToolbar({ editorRef, onReplace, onInsertAfter }) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState('');
  const [showTones, setShowTones] = useState(false);
  const [showLangs, setShowLangs] = useState(false);
  const toolbarRef = useRef(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setVisible(false);
        setShowTones(false);
        setShowLangs(false);
        return;
      }

      const editor = editorRef.current;
      if (!editor || !editor.contains(sel.anchorNode)) {
        setVisible(false);
        setShowTones(false);
        setShowLangs(false);
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
      setVisible(true);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [editorRef]);

  const getSelectedText = () => window.getSelection()?.toString() || '';

  const run = async (fn, label) => {
    const text = getSelectedText();
    if (!text) return;
    setLoading(label);
    try {
      const result = await fn(text);
      onReplace(result);
      setVisible(false);
      setShowTones(false);
      setShowLangs(false);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setLoading('');
    }
  };

  void toolbarRef;
  void onInsertAfter;

  if (!visible) return null;

  return (
    <div
      ref={toolbarRef}
      style={{
        position: 'fixed',
        left: Math.min(position.x, window.innerWidth - 320),
        top: position.y - 44,
        zIndex: 200,
        transform: 'translateX(-50%)',
      }}
      className="bg-gray-900 text-white rounded-lg shadow-2xl flex items-center gap-0.5 px-2 py-1.5 text-xs"
      onMouseDown={e => e.preventDefault()}
    >
      <span className="text-purple-400 font-semibold mr-1">✨ AI</span>

      <button
        onClick={() => run(aiFixGrammar, 'fix')}
        disabled={!!loading}
        className="px-2 py-1 rounded hover:bg-gray-700 disabled:opacity-50 whitespace-nowrap"
      >
        {loading === 'fix' ? '...' : '✓ Fix Grammar'}
      </button>

      <button
        onClick={() => run(aiSummarize, 'summarize')}
        disabled={!!loading}
        className="px-2 py-1 rounded hover:bg-gray-700 disabled:opacity-50"
      >
        {loading === 'summarize' ? '...' : '📝 Summarize'}
      </button>

      <button
        onClick={() => run(aiExpand, 'expand')}
        disabled={!!loading}
        className="px-2 py-1 rounded hover:bg-gray-700 disabled:opacity-50"
      >
        {loading === 'expand' ? '...' : '↕ Expand'}
      </button>

      <div className="relative">
        <button
          onClick={() => { setShowTones(t => !t); setShowLangs(false); }}
          disabled={!!loading}
          className="px-2 py-1 rounded hover:bg-gray-700 disabled:opacity-50"
        >
          ✍ Rewrite ▾
        </button>
        {showTones && (
          <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-lg shadow-xl py-1 min-w-[120px] z-10">
            {TONES.map(tone => (
              <button
                key={tone}
                onClick={() => { run(text => aiRewrite(text, tone), 'rewrite'); setShowTones(false); }}
                className="block w-full text-left px-3 py-1.5 hover:bg-gray-700 capitalize"
              >
                {tone}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => { setShowLangs(t => !t); setShowTones(false); }}
          disabled={!!loading}
          className="px-2 py-1 rounded hover:bg-gray-700 disabled:opacity-50"
        >
          🌐 Translate ▾
        </button>
        {showLangs && (
          <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-lg shadow-xl py-1 min-w-[120px] z-10">
            {LANGUAGES.map(lang => (
              <button
                key={lang}
                onClick={() => { run(text => aiTranslate(text, lang), 'translate'); setShowLangs(false); }}
                className="block w-full text-left px-3 py-1.5 hover:bg-gray-700"
              >
                {lang}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <span className="ml-1 text-purple-300 animate-pulse">{loading}...</span>}
    </div>
  );
}
