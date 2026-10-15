import { color, ellipsize, fitCanvas, randInt, buzz } from "../util.js";

export const W = 360;
export const H = 520;
export const MAX_BUCKETS = 12;
const BUCKET_TOP = 440;
const BALL_R = 8;
const PEG_R = 4;
const GRAVITY = 900;
const BOUNCE = 0.45;

export function makePegs() {
  const pegs = [];
  for (let row = 0, y = 70; y <= 380; row++, y += 38) {
    const start = row % 2 ? 40 : 20;
    for (let x = start; x <= W - 20; x += 40) pegs.push({ x, y });
  }
  return pegs;
}

// The winning bucket is chosen up front (so every option is equally likely, unlike a raw
// plinko board which favours the middle). The ball is gently steered toward it while
// real peg physics does the rest; the bucket it actually lands in is the result.
export function createSim(buckets, target, pegs = makePegs()) {
  const bw = W / buckets;
  const tx = (target + 0.5) * bw;
  const ball = { x: W / 2 + (Math.random() - 0.5) * 30, y: 20, vx: (Math.random() - 0.5) * 40, vy: 0 };
  const sim = { ball, pegs, done: false, bucket: -1, settle: 0, time: 0 };

  sim.step = (dt) => {
    if (sim.done) return;
    sim.time += dt;
    const p = Math.min(1, Math.max(0, (ball.y - 40) / 400));
    ball.vy += GRAVITY * dt;
    if (ball.y < BUCKET_TOP) {
      const k = 160 * p * p;
      ball.vx += (k * (tx - ball.x) - 2 * Math.sqrt(160) * p * p * ball.vx * 0.6) * dt;
    }
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    for (const peg of pegs) {
      const dx = ball.x - peg.x, dy = ball.y - peg.y;
      const d = Math.hypot(dx, dy), min = BALL_R + PEG_R;
      if (d < min && d > 0) {
        const nx = dx / d, ny = dy / d;
        ball.x = peg.x + nx * min;
        ball.y = peg.y + ny * min;
        const vn = ball.vx * nx + ball.vy * ny;
        if (vn < 0) {
          ball.vx -= (1 + BOUNCE) * vn * nx;
          ball.vy -= (1 + BOUNCE) * vn * ny;
          ball.vx += (Math.random() - 0.5) * 40;
        }
      }
    }

    if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) * BOUNCE; }
    if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx) * BOUNCE; }

    if (ball.y + BALL_R > BUCKET_TOP) {
      for (let j = 1; j < buckets; j++) {
        const dx = j * bw;
        if (Math.abs(ball.x - dx) < BALL_R + 1.5) {
          ball.x = dx + Math.sign(ball.x - dx || 1) * (BALL_R + 1.5);
          ball.vx = -ball.vx * BOUNCE;
        }
      }
    }
    if (ball.y > H - BALL_R) {
      ball.y = H - BALL_R;
      ball.vy = -ball.vy * 0.3;
      ball.vx *= 0.8;
    }

    const slow = Math.hypot(ball.vx, ball.vy) < 25;
    sim.settle = ball.y > BUCKET_TOP && slow ? sim.settle + dt : 0;
    if (sim.settle > 0.3 || sim.time > 20) {
      sim.done = true;
      sim.bucket = Math.min(buckets - 1, Math.max(0, Math.floor(ball.x / bw)));
    }
  };
  return sim;
}

export function mount(root, api) {
  let raf = null;
  let sim = null;
  let last = 0;
  const pegs = makePegs();

  root.innerHTML = `
    <div class="stage"><canvas></canvas></div>
    <div class="result" aria-live="polite"></div>
    <button class="primary drop">Drop ball</button>`;
  const canvas = root.querySelector("canvas");
  const result = root.querySelector(".result");
  const dropBtn = root.querySelector(".drop");
  const ctx = fitCanvas(canvas, W, H);
  canvas.style.aspectRatio = `${W} / ${H}`;
  root.querySelector(".stage").style.maxWidth = `min(380px, calc(58dvh * ${W} / ${H}))`;
  let highlight = -1;

  function draw() {
    const opts = api.options();
    ctx.clearRect(0, 0, W, H);
    if (opts.length < 2 || opts.length > MAX_BUCKETS) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "16px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(opts.length < 2 ? "Add at least 2 options" : `Plinko supports up to ${MAX_BUCKETS} options`, W / 2, H / 2);
      dropBtn.disabled = true;
      return;
    }
    dropBtn.disabled = !!(sim && !sim.done);
    const n = opts.length, bw = W / n;

    opts.forEach((label, i) => {
      ctx.fillStyle = color(i);
      ctx.globalAlpha = highlight === -1 || highlight === i ? 0.9 : 0.25;
      ctx.fillRect(i * bw + 1, BUCKET_TOP + 4, bw - 2, H - BUCKET_TOP - 4);
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(i * bw + bw / 2, H - 6);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "#fff";
      ctx.font = `600 ${Math.max(10, Math.min(15, bw * 0.45))}px system-ui`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(ellipsize(ctx, label, H - BUCKET_TOP - 18), 6, 0);
      ctx.restore();
    });
    ctx.fillStyle = "#cbd5e1";
    for (let j = 1; j < n; j++) ctx.fillRect(j * bw - 1.5, BUCKET_TOP, 3, H - BUCKET_TOP);
    for (const p of pegs) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, PEG_R, 0, Math.PI * 2);
      ctx.fill();
    }
    if (sim) {
      ctx.beginPath();
      ctx.arc(sim.ball.x, sim.ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = "#fde047";
      ctx.fill();
    }
  }

  function loop(now) {
    const frameDt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    for (let i = 0; i < 4; i++) sim.step(frameDt / 4);
    if (sim.done) {
      const opts = api.options();
      highlight = sim.bucket;
      result.textContent = opts[sim.bucket] ?? "";
      result.style.color = color(sim.bucket);
      buzz(120);
      draw();
      return;
    }
    draw();
    raf = requestAnimationFrame(loop);
  }

  function drop() {
    const n = api.options().length;
    if ((sim && !sim.done) || n < 2 || n > MAX_BUCKETS) return;
    highlight = -1;
    result.textContent = "";
    sim = createSim(n, randInt(n), pegs);
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  dropBtn.addEventListener("click", drop);
  canvas.addEventListener("click", drop);
  draw();
  return {
    update() {
      if (sim && !sim.done) return;
      sim = null; highlight = -1; result.textContent = ""; draw();
    },
    destroy() { cancelAnimationFrame(raf); },
  };
}
