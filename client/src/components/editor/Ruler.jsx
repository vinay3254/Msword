import { useRef, useState, useEffect, useCallback } from 'react';

export default function Ruler({ pageWidth = 794, marginLeft = 96, marginRight = 96, onMarginChange }) {
  const rulerRef = useRef(null);
  const [dragging, setDragging] = useState(null); // 'left' | 'right' | null

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

  const handleMouseDown = (side) => (e) => {
    e.preventDefault();
    setDragging(side);
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !rulerRef.current || !onMarginChange) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));

    if (dragging === 'left') {
      onMarginChange({ left: x, right: marginRight });
    }
    if (dragging === 'right') {
      onMarginChange({ left: marginLeft, right: Math.max(0, rect.width - x) });
    }
  }, [dragging, onMarginChange, marginLeft, marginRight]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div ref={rulerRef} className="ruler no-print flex-shrink-0" style={{ background: '#f3f3f3' }}>
      {/* margin shading */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: marginLeft, height: '100%', background: '#ddd', opacity: 0.6 }} />
      <div style={{ position: 'absolute', right: 0, top: 0, width: marginRight, height: '100%', background: '#ddd', opacity: 0.6 }} />

      <div
        onMouseDown={handleMouseDown('left')}
        title="Drag left margin"
        style={{ position: 'absolute', left: Math.max(0, marginLeft - 5), top: 0, width: 10, height: '100%', cursor: 'ew-resize', zIndex: 4, background: 'rgba(43,87,154,0.25)' }}
      />
      <div
        onMouseDown={handleMouseDown('right')}
        title="Drag right margin"
        style={{ position: 'absolute', right: Math.max(0, marginRight - 5), top: 0, width: 10, height: '100%', cursor: 'ew-resize', zIndex: 4, background: 'rgba(43,87,154,0.25)' }}
      />

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
