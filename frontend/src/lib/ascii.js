import { DIV, H, RAMP } from './constants.js';

export function demoImage() {
  const c = document.createElement('canvas');
  c.width = 96; c.height = 64;
  const g = c.getContext('2d');
  for (let y = 0; y < 64; y++) {
    g.fillStyle = `rgb(${40 + y * 2},${(30 + y * 1.5) | 0},${120 + y})`;
    g.fillRect(0, y, 96, 1);
  }
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(70, 18, 9, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3a7d44'; g.beginPath(); g.moveTo(0, 64); g.lineTo(30, 30); g.lineTo(60, 64); g.fill();
  g.fillStyle = '#2d5e8a'; g.beginPath(); g.moveTo(35, 64); g.lineTo(70, 24); g.lineTo(96, 64); g.fill();
  g.fillStyle = '#e8f4ff'; g.beginPath(); g.moveTo(64, 28); g.lineTo(70, 24); g.lineTo(76, 28); g.fill();
  g.fillStyle = '#1f4a2a'; g.fillRect(0, 56, 96, 8);
  return c;
}

// Display size: fit the picture into a 440px box
export function fitSize(source) {
  const iw = source.naturalWidth || source.width;
  const ih = source.naturalHeight || source.height;
  const s = Math.min(440 / iw, 440 / ih);
  return { w: iw * s, h: ih * s };
}

// Top-left position that centers the picture on the left half of the board
export function centeredPos(size) {
  return { x: (DIV - size.w) / 2, y: (H - size.h) / 2 };
}

// Averages the picture into one pixel per ASCII cell
export function buildGrid(source, size, [cw, ch]) {
  const cols = Math.max(1, Math.floor(size.w / cw));
  const rows = Math.max(1, Math.floor(size.h / ch));
  const c = document.createElement('canvas');
  c.width = cols; c.height = rows;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  g.drawImage(source, 0, 0, cols, rows);
  return { cols, rows, px: g.getImageData(0, 0, cols, rows).data };
}

// Turns the grid into rows of {ch, rgb} cells
export function cellsOf({ cols, rows, px }) {
  const res = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const i = (r * cols + c) * 4;
      const a = px[i + 3] / 255;
      const lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) * a;
      row.push({
        ch: RAMP[Math.min(RAMP.length - 1, Math.floor((lum / 256) * RAMP.length))],
        rgb: [px[i], px[i + 1], px[i + 2]],
      });
    }
    res.push(row);
  }
  return res;
}
