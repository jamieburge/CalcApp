import { color, ellipsize, fitCanvas, randInt, buzz } from "../util.js";

const SIZE = 380;
const SPIN_MS = 4500;
const TAU = Math.PI * 2;

export function mount(root, api) {
  let rotation = 0;
  let raf = null;
  let spinning = false;

  root.innerHTML = `
    <div class="stage"><canvas></canvas></div>
    <div class="result" aria-live="polite"></div>
    <button class="primary spin">Spin</button>`;
  const canvas = root.querySelector("canvas");
  const result = root.querySelector(".result");
  const spinBtn = root.querySelector(".spin");
  const ctx = fitCanvas(canvas, SIZE, SIZE);
  canvas.style.aspectRatio = "1";

  function draw() {
    const opts = api.options();
    const c = SIZE / 2;
    const r = c - 18;
    ctx.clearRect(0, 0, SIZE, SIZE);

    if (opts.length < 2) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "18px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Add at least 2 options", c, c);
      spinBtn.disabled = true;
      return;
    }
    spinBtn.disabled = spinning;

    const arc = TAU / opts.length;
    opts.forEach((label, i) => {
      const a0 = rotation + i * arc;
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.arc(c, c, r, a0, a0 + arc);
      ctx.closePath();
      ctx.fillStyle = color(i);
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(a0 + arc / 2);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.font = `600 ${Math.max(11, Math.min(20, 220 / opts.length))}px system-ui`;
      ctx.shadowColor = "rgba(0,0,0,.45)";
      ctx.shadowBlur = 3;
      ctx.fillText(ellipsize(ctx, label, r - 44), r - 14, 0);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(c, c, 16, 0, TAU);
    ctx.fillStyle = "#0f172a";
    ctx.fill();

    // Pointer at the top.
    ctx.beginPath();
    ctx.moveTo(c - 14, 2);
    ctx.lineTo(c + 14, 2);
    ctx.lineTo(c, 34);
    ctx.closePath();
    ctx.fillStyle = "#f8fafc";
    ctx.fill();
  }

  function spin() {
    const opts = api.options();
    if (spinning || opts.length < 2) return;
    const n = opts.length;
    const arc = TAU / n;
    const winner = randInt(n);

    // Land the winner's slice under the top pointer (angle -PI/2), anywhere within the slice.
    const offset = (Math.random() * 0.8 + 0.1) * arc;
    let target = -Math.PI / 2 - (winner * arc + offset);
    const from = rotation;
    target += TAU * Math.ceil((from + TAU * 5 - target) / TAU);

    spinning = true;
    spinBtn.disabled = true;
    result.textContent = "";
    const t0 = performance.now();
    const frame = (now) => {
      const t = Math.min(1, (now - t0) / SPIN_MS);
      rotation = from + (target - from) * (1 - Math.pow(1 - t, 4));
      draw();
      if (t < 1) { raf = requestAnimationFrame(frame); return; }
      spinning = false;
      rotation %= TAU;
      result.textContent = opts[winner];
      result.style.color = color(winner);
      draw();
      buzz(120);
    };
    raf = requestAnimationFrame(frame);
  }

  spinBtn.addEventListener("click", spin);
  canvas.addEventListener("click", spin);
  draw();
  return {
    update() { if (!spinning) { result.textContent = ""; draw(); } },
    destroy() { cancelAnimationFrame(raf); },
  };
}
