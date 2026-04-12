export default function Ruler({ pageWidth = 794, marginLeft = 96, marginRight = 96 }) {
  const ticks = [];
  const totalPx = pageWidth;
  const pxPerInch = 96;
  const inches = Math.ceil(totalPx / pxPerInch) + 1;

  for (let i = 0; i <= inches * 4; i++) {
    const x   = (i / 4) * pxPerInch;
    const isIn = i % 4 === 0;
    const isHalf = i % 2 === 0;
    if (x > totalPx) break;
    ticks.push({ x, isIn, isHalf, label: isIn ? i / 4 : null });
  }

  return (
    <div className="ruler no-print flex-shrink-0" style={{ background: '#f3f3f3' }}>
      {/* margin shading */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: marginLeft, height: '100%', background: '#ddd', opacity: 0.6 }} />
      <div style={{ position: 'absolute', right: 0, top: 0, width: marginRight, height: '100%', background: '#ddd', opacity: 0.6 }} />

      <svg width={totalPx} height={20} style={{ display: 'block' }}>
        {ticks.map(({ x, isIn, isHalf, label }) => (
          <g key={x}>
            <line x1={x} y1={isIn ? 0 : isHalf ? 6 : 10} x2={x} y2={20} stroke="#aaa" strokeWidth={isIn ? 1 : 0.5} />
            {label !== null && label > 0 && (
              <text x={x} y={9} fontSize={8} fill="#888" textAnchor="middle">{label}"</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
