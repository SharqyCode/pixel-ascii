import { THEMES } from "./constants.js";
import { cellsOf } from "./ascii.js";

export function asciiText(grid) {
  return cellsOf(grid)
    .map((row) =>
      row
        .map((k) => k.ch)
        .join("")
        .replace(/\s+$/, ""),
    )
    .join("\n");
}

// Renders the full ASCII image (not just the visible part) and returns a PNG data URL
export function asciiPng(grid, [cw, ch], { color, theme }) {
  const t = THEMES[theme];
  const c = document.createElement("canvas");
  c.width = grid.cols * cw;
  c.height = grid.rows * ch;
  const g = c.getContext("2d");
  g.fillStyle = t.bg;
  g.fillRect(0, 0, c.width, c.height);
  g.font = `bold ${ch}px "Courier New", monospace`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  cellsOf(grid).forEach((row, r) =>
    row.forEach((k, col) => {
      if (k.ch === " ") return;
      g.fillStyle = color ? `rgb(${k.rgb.join(",")})` : t.ascii;
      g.fillText(k.ch, col * cw + cw / 2, r * ch + ch / 2);
    }),
  );
  return c.toDataURL("image/png");
}

export function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
