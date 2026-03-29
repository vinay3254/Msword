export default function WordCountModal({ stats, onClose }) {
  const { words = 0, chars = 0, charsNoSpaces = 0, paragraphs = 0, lines = 0 } = stats || {};
  const pages = Math.max(1, Math.ceil(words / 300));
  const readMin = Math.max(1, Math.ceil(words / 200));

  const rows = [
    { label: 'Words',                   value: words.toLocaleString() },
    { label: 'Characters (with spaces)',value: chars.toLocaleString() },
    { label: 'Characters (no spaces)',  value: charsNoSpaces.toLocaleString() },
    { label: 'Paragraphs',              value: paragraphs.toLocaleString() },
    { label: 'Lines',                   value: lines.toLocaleString() },
    { label: 'Estimated pages',         value: pages.toLocaleString() },
    { label: 'Reading time',            value: `~${readMin} min` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-72 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Word Count</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-5">
          <div className="divide-y divide-gray-100">
            {rows.map(r => (
              <div key={r.label} className="flex justify-between items-center py-2.5">
                <span className="text-sm text-gray-600">{r.label}</span>
                <span className="text-sm font-semibold text-gray-800">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 pb-5 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-[#2b579a] text-white rounded-lg hover:bg-[#1e3f73]">Close</button>
        </div>
      </div>
    </div>
  );
}
