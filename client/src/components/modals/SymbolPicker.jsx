import { useState } from 'react';

const SYMBOLS = {
  Common: ['©', '®', '™', '°', '±', '×', '÷', '≠', '≤', '≥', '∞', '√', 'π', 'Σ', 'μ'],
  Punctuation: ['—', '–', '…', '"', '"', "'", "'", '«', '»', '•', '·', '¶', '§'],
  Currency: ['€', '£', '¥', '¢', '₹', '₽', '₩', '฿', '₿'],
  Arrows: ['←', '→', '↑', '↓', '↔', '⇐', '⇒', '⇑', '⇓', '⇔'],
  Math: ['α', 'β', 'γ', 'δ', 'θ', 'λ', 'φ', 'ψ', 'ω', 'Δ', 'Ω', '∫', '∂', '∑', '∏'],
  Emoji: ['★', '☆', '♥', '♦', '♣', '♠', '✓', '✗', '⚠', '☎', '✉', '🔒', '🔑'],
};

export default function SymbolPicker({ onInsert, onClose }) {
  const [activeCategory, setActiveCategory] = useState('Common');
  const [search, setSearch] = useState('');

  const allSymbols = Object.values(SYMBOLS).flat();
  const displayed = search
    ? allSymbols.filter(s => s.includes(search))
    : SYMBOLS[activeCategory];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-96 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Symbol Picker</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="p-4">
          <input
            placeholder="Search symbols..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm mb-3"
          />

          {!search && (
            <div className="flex gap-1 flex-wrap mb-3">
              {Object.keys(SYMBOLS).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-1 text-xs rounded ${activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-8 gap-1 max-h-64 overflow-auto">
            {displayed.map((sym, i) => (
              <button
                key={`${sym}-${i}`}
                onClick={() => onInsert(sym)}
                className="w-9 h-9 text-lg hover:bg-blue-50 rounded border border-transparent hover:border-blue-300"
                title={`U+${sym.codePointAt(0).toString(16).toUpperCase()}`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
