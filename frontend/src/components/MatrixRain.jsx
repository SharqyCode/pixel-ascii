import { useEffect, useRef } from 'react';
import { GLYPHS } from '../lib/constants.js';

// Falling-character background; the animation only runs while `active` is true
export default function MatrixRain({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const rain = canvasRef.current;
    const rctx = rain.getContext('2d');
    let drops = [];
    let rafId;

    const size = () => {
      rain.width = innerWidth;
      rain.height = innerHeight;
      drops = Array.from({ length: Math.ceil(innerWidth / 16) }, () => Math.random() * innerHeight / 16);
    };

    function rainFrame() {
      rctx.fillStyle = "rgba(0,0,0,0.04)";
      rctx.fillRect(0, 0, rain.width, rain.height);
      rctx.font = "1.5rem monospace";
      drops.forEach((y, i) => {
        rctx.fillStyle = Math.random() < 0.03 ? "#d6ffe0" : "#00ff41";
        rctx.fillText(
          GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          i * 16,
          y * 16,
        );
        drops[i] =
          y * 16 > rain.height && Math.random() > 0.975
            ? 0
            : y + 0.005 + Math.random() * 0.5;
      });
      rafId = requestAnimationFrame(rainFrame);
    }

    size();
    rctx.fillStyle = '#000';
    rctx.fillRect(0, 0, rain.width, rain.height);
    rainFrame();
    window.addEventListener('resize', size);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', size);
    };
  }, [active]);

  return <canvas ref={canvasRef} className={active ? 'rain' : 'rain hidden'} />;
}
