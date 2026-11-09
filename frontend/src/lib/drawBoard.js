import { DIV, H, THEMES, W } from './constants.js';
import { cellsOf } from './ascii.js';

// Generated once so the retro starfield stays put between redraws
const STARS = Array.from({ length: 70 }, () => [Math.random() * W, Math.random() * H, Math.random() < 0.2]);

export function drawBoard(ctx, { source, size, pos, grid, cell, color, theme }) {
  const t = THEMES[theme];
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);

  if (theme === 'retro') {
    ctx.fillStyle = '#fff';
    for (const [x, y, big] of STARS) ctx.fillRect(x, y, big ? 3 : 2, big ? 3 : 2);
    ctx.fillStyle = 'rgba(75,72,184,0.12)';
    for (let x = 0; x < W; x += 24) for (let y = 0; y < H; y += 24) ctx.fillRect(x, y, 2, 2);
  }

  // left half: original picture
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, DIV, H); ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, pos.x, pos.y, size.w, size.h);
  ctx.restore();

  // right half: ASCII grid, moving with the picture
  const [cw, ch] = cell;
  ctx.save();
  ctx.beginPath(); ctx.rect(DIV, 0, W - DIV, H); ctx.clip();
  ctx.font = `bold ${ch}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  cellsOf(grid).forEach((row, r) => row.forEach((k, c) => {
    if (k.ch === ' ') return;
    ctx.fillStyle = color ? `rgb(${k.rgb.join(',')})` : t.ascii;
    ctx.fillText(k.ch, pos.x + c * cw + cw / 2, pos.y + r * ch + ch / 2);
  }));
  ctx.restore();

  // divider and labels
  ctx.fillStyle = t.label;
  for (let y = 0; y < H; y += 12) ctx.fillRect(DIV - 3, y, 6, 6);
  ctx.font = '12px "Press Start 2P", monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left'; ctx.fillText('ORIGINAL', 14, 12);
  ctx.textAlign = 'right'; ctx.fillText('ASCII', W - 14, 12);
}
