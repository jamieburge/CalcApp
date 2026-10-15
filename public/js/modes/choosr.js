import { PALETTE, pick, buzz, fitCanvas } from "../util.js";

const COUNT_MS = 2500;
const R = 46;
const TAU = Math.PI * 2;

export function mount(root, api) {
  root.classList.add("fill");
  root.innerHTML = `<div class="touch"><canvas></canvas></div>`;
  const box = root.querySelector(".touch");
  const canvas = box.querySelector("canvas");
  let ctx, w = 0, h = 0, raf = null;

  const fingers = new Map(); // pointer id -> {x, y, color}
  let phase = "waiting"; // waiting | counting | done
  let changedAt = 0;
  let winner = null;
  let label = "";
  let colorIdx = 0;

  function resize() {
    w = box.clientWidth; h = box.clientHeight;
    if (w && h) ctx = fitCanvas(canvas, w, h);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(box);

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function fingersChanged() {
    if (phase === "done") return;
    changedAt = performance.now();
    phase = fingers.size >= 2 ? "counting" : "waiting";
  }

  function add(id, e) {
    if (phase === "done") return;
    fingers.set(id, { ...pos(e), color: PALETTE[colorIdx++ % PALETTE.length] });
    fingersChanged();
  }

  function remove(id) {
    fingers.delete(id);
    if (phase === "done") {
      if (fingers.size === 0) { phase = "waiting"; winner = null; label = ""; }
      return;
    }
    fingersChanged();
  }

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return; // handled by click below (toggle fingers)
    e.preventDefault();
    add(e.pointerId, e);
  });
  canvas.addEventListener("pointermove", (e) => {
    const f = fingers.get(e.pointerId);
    if (f) Object.assign(f, pos(e));
  });
  for (const type of ["pointerup", "pointercancel"]) {
    canvas.addEventListener(type, (e) => { if (e.pointerType !== "mouse") remove(e.pointerId); });
  }
  // Mouse users (no multi-touch): click to place a finger, click it again to remove.
  canvas.addEventListener("click", (e) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    const p = pos(e);
    for (const [id, f] of fingers) {
      if (Math.hypot(f.x - p.x, f.y - p.y) < R) { remove(id); return; }
    }
    add("mouse" + Date.now() + Math.random(), e);
  });

  function choose() {
    const ids = [...fingers.keys()];
    winner = pick(ids);
    const opts = api.options();
    label = opts.length ? pick(opts) : "";
    phase = "done";
    buzz(200);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!ctx) return;
    if (phase === "counting" && now - changedAt >= COUNT_MS) choose();
    ctx.clearRect(0, 0, w, h);

    if (!fingers.size) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "18px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Everyone put a finger on the screen", w / 2, h / 2 - 10);
      ctx.font = "14px system-ui";
      ctx.fillText("(on desktop, click to add fingers)", w / 2, h / 2 + 16);
      return;
    }

    for (const [id, f] of fingers) {
      const isWinner = phase === "done" && id === winner;
      const lost = phase === "done" && !isWinner;
      const pulse = isWinner ? 1 + 0.12 * Math.sin(now / 120) : 1;
      const radius = (isWinner ? R * 1.5 : R) * pulse;
      ctx.globalAlpha = lost ? 0.18 : 1;
      ctx.beginPath();
      ctx.arc(f.x, f.y, radius, 0, TAU);
      ctx.fillStyle = f.color;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(255,255,255,.85)";
      ctx.beginPath();
      ctx.arc(f.x, f.y, radius + 12, -Math.PI / 2, -Math.PI / 2 + (phase === "counting" ? Math.min(1, (now - changedAt) / COUNT_MS) * TAU : phase === "done" ? TAU : 0));
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (isWinner && label) {
        ctx.font = "700 22px system-ui";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "#000"; ctx.shadowBlur = 6;
        const y = f.y - radius - 26 > 24 ? f.y - radius - 26 : f.y + radius + 36;
        ctx.fillText(label, Math.max(60, Math.min(w - 60, f.x)), y);
        ctx.shadowBlur = 0;
      }
    }

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 16px system-ui";
    ctx.textAlign = "center";
    const msg = phase === "waiting" ? "Need at least 2 fingers…"
      : phase === "counting" ? "Hold still…"
      : "Lift all fingers to go again";
    ctx.fillText(msg, w / 2, 28);
  }
  raf = requestAnimationFrame(frame);

  return {
    update() {},
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); },
  };
}
