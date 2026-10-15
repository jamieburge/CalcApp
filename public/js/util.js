export const PALETTE = [
  "#ef4444", "#f59e0b", "#84cc16", "#10b981", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6",
];

export const color = (i) => PALETTE[i % PALETTE.length];

export const parseOptions = (text) =>
  text.split("\n").map((s) => s.trim()).filter(Boolean);

export const randInt = (n) => Math.floor(Math.random() * n);

export const pick = (arr) => arr[randInt(arr.length)];

export const buzz = (ms = 60) => {
  try { navigator.vibrate && navigator.vibrate(ms); } catch { /* unsupported */ }
};

export function fitCanvas(canvas, w, h) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function ellipsize(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  while (text.length > 1 && ctx.measureText(text + "…").width > maxWidth) {
    text = text.slice(0, -1);
  }
  return text + "…";
}
