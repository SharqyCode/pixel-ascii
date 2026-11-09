// Synthesized sounds via the Web Audio API (no audio files needed)
let ac = null;
let hum = null; // the continuous tone while the picture sits on the line

// Call once from a pointer-down handler so the browser allows audio
export function unlockAudio() {
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === "suspended") ac.resume();
}

// Short "zing" for a quick pass over the line
export function playZing() {
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(1800, t);
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.12);
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.16);
}

// Continuous tone that plays without gaps until stopHum() is called
function startHum() {
  if (!ac || hum) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "square";
  osc.frequency.value = 600;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.08, t + 0.05); // fade in to avoid a click
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  hum = { osc, gain };
}

function stopHum() {
  if (!hum || !ac) return;
  const t = ac.currentTime;
  const { osc, gain } = hum;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(gain.gain.value, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); // fade out to avoid a click
  osc.stop(t + 0.09);
  hum = null;
}

// Quick zing on entry; a continuous tone if the picture stays on the line past quickMs
export function createLineZinger({ quickMs = 300 } = {}) {
  let over = false,
    timer = null;

  const clearTimer = () => {
    clearTimeout(timer);
    timer = null;
  };

  return {
    update(isOver) {
      if (isOver && !over) {
        over = true;
        playZing();
        timer = setTimeout(startHum, quickMs);
      } else if (!isOver && over) {
        over = false;
        clearTimer();
        stopHum();
      }
    },
    stop() {
      over = false;
      clearTimer();
      stopHum();
    },
  };
}
