import { useEffect, useRef, useState } from 'react';
import { W, H } from '../lib/constants.js';
import { centeredPos } from '../lib/ascii.js';
import { drawBoard } from '../lib/drawBoard.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export default function Board({ source, size, grid, cell, color, theme, centerSignal, onFile }) {
  const canvasRef = useRef(null);
  const pos = useRef(centeredPos(size));
  const dragOffset = useRef(null);
  const [dragging, setDragging] = useState(false);

  const paint = () => {
    drawBoard(canvasRef.current.getContext('2d'), {
      source, size, pos: pos.current, grid, cell, color, theme,
    });
  };

  // re-center when a new picture loads or Center is pressed (runs before paint)
  useEffect(() => { pos.current = centeredPos(size); }, [size, centerSignal]);
  useEffect(() => { paint(); }, [source, size, grid, cell, color, theme, centerSignal]);

  const toBoard = e => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  };

  const onPointerDown = e => {
    const p = toBoard(e);
    const inside = p.x >= pos.current.x && p.x <= pos.current.x + size.w &&
                   p.y >= pos.current.y && p.y <= pos.current.y + size.h;
    if (!inside) return;
    dragOffset.current = { dx: p.x - pos.current.x, dy: p.y - pos.current.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = e => {
    if (!dragOffset.current) return;
    const p = toBoard(e), { dx, dy } = dragOffset.current;
    pos.current = {
      x: clamp(p.x - dx, 40 - size.w, W - 40),
      y: clamp(p.y - dy, 40 - size.h, H - 40),
    };
    paint();
  };

  const endDrag = () => {
    dragOffset.current = null;
    setDragging(false);
  };

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className={dragging ? 'board dragging' : 'board'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
    />
  );
}
