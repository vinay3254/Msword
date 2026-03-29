import { useState } from 'react';

export default function TableDialog({ onInsert, onClose }) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [hover, setHover] = useState({ r: 0, c: 0 });
  const GRID = 10;

  const handleInsert = () => {
    onInsert(rows, cols);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-80 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Insert Table</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          {/* Grid picker */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Hover to select size ({hover.r}×{hover.c})</p>
            <div
              className="inline-grid gap-0.5"
              style={{ gridTemplateColumns: `repeat(${GRID}, 22px)` }}
              onMouseLeave={() => setHover({ r: 0, c: 0 })}
              onClick={() => { setRows(hover.r); setCols(hover.c); }}
            >
              {Array.from({ length: GRID }, (_, r) =>
                Array.from({ length: GRID }, (_, c) => (
                  <div
                    key={`${r}-${c}`}
                    className={`w-5 h-5 border cursor-pointer ${r < hover.r && c < hover.c ? 'bg-blue-200 border-[#2b579a]' : 'border-gray-300 hover:border-gray-400'}`}
                    onMouseEnter={() => setHover({ r: r + 1, c: c + 1 })}
                  />
                ))
              )}
            </div>
          </div>

          {/* Manual inputs */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Rows</label>
              <input type="number" min={1} max={50} value={rows}
                onChange={e => setRows(Math.max(1, Math.min(50, +e.target.value)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2b579a]"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Columns</label>
              <input type="number" min={1} max={20} value={cols}
                onChange={e => setCols(Math.max(1, Math.min(20, +e.target.value)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2b579a]"
              />
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 flex justify-end gap-2">
          <button onClick={onClose}    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleInsert} className="px-4 py-2 text-sm bg-[#2b579a] text-white rounded-lg hover:bg-[#1e3f73]">Insert Table</button>
        </div>
      </div>
    </div>
  );
}
