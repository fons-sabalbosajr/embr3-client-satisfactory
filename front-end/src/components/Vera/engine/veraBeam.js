// ---------------------------------------------------------------------------
// VeraBeam — a border-beam glow that travels round an outline on a 2D canvas.
// Ported from the "Vera border beam" design.
//
// Two outlines: "flame" (the VERA mark's own outline, with its inner hole) and
// "rect" (the rounded edge of the element the canvas sits over — the launcher
// pill, a card — of any proportions, measured from the canvas itself). The
// beam is drawn in coloured slices with a bloom, so it reads as light rather
// than a stroke.
//
//   rotate         a comet runs round the outline (and the hole, backwards)
//   line           a short bright segment rocks along the base
//   pulse-inner    the whole outline breathes, glowing inward
//   pulse-outside  the whole outline breathes, glowing outward
//
// `active` fades the beam in and out, leaving the idle hairline, so the same
// canvas can sit quietly and light up while VERA is busy.
// ---------------------------------------------------------------------------

import FLAME_PATHS from "./veraBeamPaths.json";
import { resolveTheme } from "./veraFlame";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const PALETTES = {
  // [h, s, l] stops along the beam
  vera: [[186, 100, 56], [170, 80, 50], [140, 75, 52], [100, 85, 60]],
  colorful: [[0, 100, 62], [45, 100, 58], [120, 85, 55], [190, 100, 56], [255, 95, 66], [315, 95, 64]],
  ocean: [[212, 95, 62], [238, 88, 68], [272, 82, 68], [192, 95, 58]],
  sunset: [[24, 98, 58], [46, 98, 58], [2, 90, 60], [332, 90, 64]],
  mono: [[0, 0, 98], [0, 0, 72], [0, 0, 86]],
};
const DURATION = { rotate: 1.96 * 1.6, line: 3.1, "pulse-inner": 2.3, "pulse-outside": 2.3 };

export const BEAM_TYPES = Object.keys(DURATION);

/**
 * A palette from a named one, or from any hex colour — the app's accent — as
 * four stops either side of its hue, so the beam reads as that colour with a
 * little life in it rather than one flat stroke.
 */
const fromHex = new Map();
function paletteOf(color) {
  if (PALETTES[color]) return PALETTES[color];
  const m = /^#?([0-9a-f]{6})$/i.exec(String(color || ''));
  if (!m) return PALETTES.vera;
  if (fromHex.has(m[1])) return fromHex.get(m[1]);
  const n = parseInt(m[1], 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  const l = (max + min) / 2;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  const sat = Math.round(Math.max(55, s * 100));
  const pal = [[h - 16, sat, 62], [h, sat, 56], [h + 14, sat, 54], [h + 30, sat, 60]];
  fromHex.set(m[1], pal);
  return pal;
}
export const BEAM_COLORS = Object.keys(PALETTES);

// ---- geometry ---------------------------------------------------------------

function prepPath(pts) {
  const n = pts.length, cum = new Float32Array(n + 1);
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    cum[i + 1] = cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return { pts, n, cum, L: cum[n] };
}

/** The point at arc length s, wrapping. */
function at(P, s) {
  s = ((s % P.L) + P.L) % P.L;
  let lo = 0, hi = P.n;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (P.cum[m] <= s) lo = m;
    else hi = m;
  }
  const a = P.pts[lo], b = P.pts[(lo + 1) % P.n];
  const seg = P.cum[lo + 1] - P.cum[lo] || 1, t = (s - P.cum[lo]) / seg;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * A rounded rectangle of half-width hw, half-height hh and corner radius r,
 * centred on the origin, sampled evenly and clockwise from the top edge.
 */
function roundRect(hw, hh, r, N = 320) {
  r = Math.max(0.0001, Math.min(r, hw, hh));
  const ex = 2 * (hw - r), ey = 2 * (hh - r), arc = (Math.PI / 2) * r;
  const edges = [ex, ey, ex, ey];
  const per = 2 * (ex + ey) + 4 * arc;
  // The start of each straight edge (top, right, bottom, left), its direction,
  // and the centre of the corner that follows it.
  const starts = [[-(hw - r), -hh], [hw, -(hh - r)], [hw - r, hh], [-hw, hh - r]];
  const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const centres = [[hw - r, -(hh - r)], [hw - r, hh - r], [-(hw - r), hh - r], [-(hw - r), -(hh - r)]];
  const pts = [];
  for (let k = 0; k < N; k++) {
    let d = (k / N) * per;
    for (let side = 0; side < 4; side++) {
      if (d <= edges[side]) {
        pts.push([starts[side][0] + dirs[side][0] * d, starts[side][1] + dirs[side][1] * d]);
        break;
      }
      d -= edges[side];
      if (d <= arc || side === 3) {
        const a = -Math.PI / 2 + side * (Math.PI / 2) + Math.min(d, arc) / r;
        pts.push([centres[side][0] + Math.cos(a) * r, centres[side][1] + Math.sin(a) * r]);
        break;
      }
      d -= arc;
    }
  }
  return pts;
}

const FLAME = FLAME_PATHS.map((p) => ({ hole: p.hole, ...prepPath(p.p) }));

function tracePaths(ctx, paths) {
  ctx.beginPath();
  for (const P of paths) {
    ctx.moveTo(P.pts[0][0], P.pts[0][1]);
    for (let i = 1; i < P.n; i++) ctx.lineTo(P.pts[i][0], P.pts[i][1]);
    ctx.closePath();
  }
}
function hsl(c, dh, dl, a) {
  return `hsla(${(c[0] + dh + 360) % 360},${c[1]}%,${clamp(c[2] + dl, 0, 100)}%,${a})`;
}
function colorAt(pal, f) {
  const x = clamp(f, 0, 0.9999) * (pal.length - 1), i = Math.floor(x), t = x - i;
  const a = pal[i], b = pal[Math.min(i + 1, pal.length - 1)];
  let dh = b[0] - a[0];
  if (Math.abs(dh) > 180) dh -= Math.sign(dh) * 360;
  return [a[0] + dh * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * Starts the beam on a canvas sized by CSS.
 * opts: shape ("flame" on a square canvas | "rect"), type, color, theme,
 *       strength, speed, hueRange, active, paused,
 *       rect ({ inset, radius } in CSS pixels: how far inside the canvas the
 *       edge runs — room for the bloom — and its corner radius, or "pill").
 */
export function mountBeam(canvas, o = {}) {
  const opt = {
    shape: "flame", type: "rotate", color: "vera", theme: "auto",
    strength: 1, speed: 1, hueRange: 30, active: true,
    rect: { inset: 10, radius: "pill" },
    ...o,
  };
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1, t = 0, last = performance.now(), raf = 0;
  let level = opt.active ? 1 : 0, visible = true, paused = !!o.paused;
  let rectPaths = null;
  // For "rect" the unit is half the canvas height, so the beam's widths and
  // glow read the same on a short pill and a tall card.
  const unit = () => (opt.shape === "rect" ? H / 2 : W * 0.4);
  const rect = () => {
    if (rectPaths) return rectPaths;
    const k = unit(), inset = opt.rect.inset || 0;
    const hw = (W / 2 - inset) / k, hh = (H / 2 - inset) / k;
    const r = opt.rect.radius === "pill" ? hh : (opt.rect.radius || 0) / k;
    rectPaths = [{ hole: false, ...prepPath(roundRect(hw, hh, r)) }];
    return rectPaths;
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = opt.shape === "rect" ? canvas.clientHeight : W;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    rectPaths = null;
    draw();
  };

  // A stretch of path [s0, s1] in coloured slices; fa(f) is the alpha along it.
  function band(P, s0, s1, width, fa, fc, blur, pal, dh, dl) {
    const slices = 24, step = (s1 - s0) / slices;
    ctx.lineWidth = width;
    ctx.lineCap = "butt";
    ctx.lineJoin = "round";
    for (let b = 0; b < slices; b++) {
      const f = (b + 0.5) / slices, a = fa(f);
      if (a <= 0.004) continue;
      const c = colorAt(pal, fc(f));
      ctx.strokeStyle = hsl(c, dh, dl, a);
      if (blur) {
        ctx.shadowBlur = blur * dpr;
        ctx.shadowColor = hsl(c, dh, dl, Math.min(1, a * 1.2));
      }
      ctx.beginPath();
      const sA = s0 + b * step, sB = sA + step, sub = 4;
      for (let k = 0; k <= sub; k++) {
        const p = at(P, sA + ((sB - sA) * k) / sub);
        if (k) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    level += ((opt.active ? 1 : 0) - level) * Math.min(1, dt * 5);
    if (!visible || document.hidden) return;
    if (!paused) t += dt * opt.speed;
    draw();
  }

  function draw() {
    if (!W || !H) return;
    const dark = resolveTheme(canvas, opt.theme) === "dark";
    const isRect = opt.shape === "rect";
    const k = unit(), px = 1 / k; // px → shape units
    // The canvas's own half-extent in shape units, plus a margin.
    const bx = W / 2 / k + 0.3, by = H / 2 / k + 0.3;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * k, 0, 0, dpr * k, (dpr * W) / 2, (dpr * H) / 2);
    const paths = isRect ? rect() : FLAME;
    const pal = paletteOf(opt.color);
    const dh = opt.color === "mono" ? 0 : (Math.sin((t * TAU) / 6) * opt.hueRange) / 2;
    const dl = dark ? 0 : -14;
    const S = opt.strength * level;

    // On the flame, a faint fill and hairline stand for the mark itself. On a
    // rect the element underneath draws its own background and border.
    if (!isRect) {
      tracePaths(ctx, paths);
      ctx.fillStyle = dark ? "rgba(160,230,220,0.05)" : "rgba(13,43,49,0.04)";
      ctx.fill("evenodd");
      ctx.lineWidth = 1 * px;
      ctx.strokeStyle = dark ? "rgba(221,245,240,0.16)" : "rgba(13,43,49,0.16)";
      ctx.stroke();
    }
    if (S <= 0.003) return;

    ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
    const d = DURATION[opt.type] || DURATION.rotate;
    const breath = 0.5 - 0.5 * Math.cos((t * TAU) / d);

    if (opt.type === "line") {
      const P = paths[0];
      let low = 0;
      for (let i = 0; i < P.n; i++) if (P.pts[i][1] > P.pts[low][1]) low = i;
      const sLow = P.cum[low], span = P.L * 0.16, c = sLow + Math.sin((t * TAU) / d) * span, half = P.L * 0.13;
      const fa = (f) => Math.sin(f * Math.PI) ** 1.4 * S;
      band(P, c - half, c + half, 8 * px, (f) => fa(f) * 0.3, (f) => f, 16, pal, dh, dl);
      band(P, c - half, c + half, 1.8 * px, fa, (f) => f, 0, pal, dh, dl + (dark ? 12 : 0));
    } else if (opt.type === "pulse-inner" || opt.type === "pulse-outside") {
      const inner = opt.type === "pulse-inner";
      const A = (0.25 + 0.75 * breath) * S;
      ctx.save();
      tracePaths(ctx, paths);
      if (inner) ctx.clip("evenodd");
      else {
        ctx.rect(-bx, -by, 2 * bx, 2 * by);
        ctx.clip("evenodd");
      }
      paths.forEach((P) =>
        band(P, 0, P.L, (inner ? 12 : 10) * px, () => A * (inner ? 0.35 : 0.4), (f) => f, inner ? 10 : 26, pal, dh, dl)
      );
      ctx.restore();
      paths.forEach((P) => band(P, 0, P.L, 1.4 * px, () => A * 0.9, (f) => f, 0, pal, dh, dl + (dark ? 10 : 0)));
    } else {
      paths.forEach((P) => {
        const dir = P.hole ? -1 : 1, prog = (t / d) % 1;
        const head = dir * prog * P.L + (P.hole ? P.L * 0.5 : 0);
        const tail = P.L * (P.hole ? 0.5 : 0.4), g = P.hole ? 0.8 : 1;
        const s0 = dir > 0 ? head - tail : head, s1 = dir > 0 ? head : head + tail;
        const fa = (f) => Math.pow(dir > 0 ? f : 1 - f, 1.7) * S * g; // bright at the head
        const fc = (f) => (dir > 0 ? 1 - f : f);
        // `rect.tight` (a beam on a button's edge): the bloom is centred on the
        // path, so at full width most of the light landed OUTSIDE the button and
        // read as a halo offset from its outline. Tight keeps it on the edge.
        const tight = isRect && opt.rect?.tight;
        band(P, s0, s1, (tight ? 5 : 10) * px, (f) => fa(f) * 0.22, fc, tight ? 9 : 22, pal, dh, dl); // outer bloom
        band(P, s0, s1, (tight ? 3 : 4) * px, (f) => fa(f) * 0.45, fc, tight ? 4 : 8, pal, dh, dl); // glow
        band(P, s0, s1, 2.2 * px, fa, fc, 0, pal, dh, dl + (dark ? 14 : 0)); // stroke
        // Light spilling into the shape at the head.
        const hp = at(P, head);
        ctx.save();
        tracePaths(ctx, paths);
        ctx.clip("evenodd");
        const rg = ctx.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], 0.42);
        const c = colorAt(pal, 0);
        rg.addColorStop(0, hsl(c, dh, dl, 0.22 * S * g));
        rg.addColorStop(1, hsl(c, dh, dl, 0));
        ctx.fillStyle = rg;
        ctx.fillRect(-bx, -by, 2 * bx, 2 * by);
        ctx.restore();
        ctx.fillStyle = dark ? `rgba(255,255,255,${0.9 * S * g})` : hsl(c, dh, dl - 10, 0.9 * S * g);
        ctx.beginPath();
        ctx.arc(hp[0], hp[1], 1.9 * px, 0, TAU);
        ctx.fill();
      });
    }
    ctx.globalCompositeOperation = "source-over";
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver((e) => (visible = e[0].isIntersecting));
  io.observe(canvas);
  resize();
  raf = requestAnimationFrame(frame);
  canvas.setAttribute("aria-hidden", "true");

  return {
    set(p) {
      if (p.rect) rectPaths = null;
      Object.assign(opt, p);
      draw();
    },
    setPaused(v) { paused = v; },
    get options() { return { ...opt }; },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    },
  };
}
