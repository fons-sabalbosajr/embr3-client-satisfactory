// ---------------------------------------------------------------------------
// VeraFlame — VERA's mark as a field of coloured dots on a 2D canvas, with
// animated states. Ported from the "Vera flame — animated icon" design.
//
// The dot positions and colours come from the logo (veraDots.json, three
// densities); each state moves every dot as a function of time, and a change
// of state hands over dot by dot rather than cutting.
//
//   burning    resting: flickers upward, embers drift off the tips
//   thinking   gathers into a rotating dotted orb
//   working    a few dots orbit the flame on tilted rings
//   searching  a scan band sweeps across while the flame turns
//   listening  a waveform rolls through the rows
//   breathing  a slow pulse ripples out from the centre
//   igniting   the orb catches fire from the bottom up, then loops
//
// Drawing stops while the canvas is off screen or the tab is hidden, so a
// launcher that sits on every page costs nothing when nobody can see it.
// ---------------------------------------------------------------------------

import DATA from "./veraDots.json";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (k) => k * k * (3 - 2 * k);
const mix = (a, b, k) => a + (b - a) * k;

function prepare(key) {
  const g = DATA[key];
  const n = g.p.length;
  return {
    s: g.s,
    dots: g.p.map((d, i) => {
      const seed = ((i * 2654435761) >>> 0) / 4294967296; // stable hash
      const seed2 = ((i * 40503 + 17) % 997) / 997;
      // Fibonacci-sphere target for the orb.
      const fy = 1 - ((i + 0.5) / n) * 2,
        fr = Math.sqrt(1 - fy * fy),
        fa = i * 2.399963;
      return {
        x: d[0], y: d[1], edge: d[3], seed, seed2,
        z: (seed2 - 0.5) * 0.12,
        r: (d[2] >> 16) & 255, g: (d[2] >> 8) & 255, b: d[2] & 255,
        sx: Math.cos(fa) * fr, sy: fy, sz: Math.sin(fa) * fr,
        h: clamp((1 - d[1]) / 2, 0, 1),
        hd: Math.hypot(d[0] - DATA.hole[0], d[1] - DATA.hole[1]),
      };
    }),
  };
}
const GRIDS = {};
const grid = (k) => GRIDS[k] || (GRIDS[k] = prepare(k));

// Each state writes [x, y, z, sizeMul, alphaMul] for one dot at time t.
function burning(p, t, o = []) {
  const h = p.h;
  const lick = 0.5 + 0.5 * Math.sin(t * 4.2 - p.y * 7 + p.seed * 2.5);
  const calm = p.edge ? 0.45 : 1; // the outline moves less, so the silhouette stays crisp
  const sway = Math.sin(t * 2.6 + p.y * 5 + p.x * 2) * 0.01 * (0.2 + h) * h;
  let x = p.x + sway + Math.sin(t * 2.6 + p.y * 5 + p.seed * 6) * 0.006 * (0.25 + h) * calm;
  let y = p.y - lick * 0.022 * h * h * calm;
  let s = p.edge
    ? 0.94 + 0.1 * Math.sin(t * 4 - p.y * 8)
    : 0.74 + 0.36 * (0.5 + 0.5 * Math.sin(t * 5 - p.y * 9 + p.seed * 4));
  let a = 1;
  if (p.edge && h > 0.5 && p.seed > 0.8) {
    // embers drifting off the tips
    const ph = (t * 0.55 + p.seed * 7.3) % 1;
    if (ph > 0.55) {
      const e = (ph - 0.55) / 0.45;
      y -= e * 0.32;
      x += Math.sin(e * 5 + p.seed * 9) * 0.04 * e;
      s *= 1 - e * 0.8;
      a = 1 - e;
    }
  }
  o[0] = x; o[1] = y; o[2] = p.z; o[3] = s; o[4] = a;
  return o;
}

function sphere(p, t, o = [], R = 0.66) {
  const ry = t * 0.7, rx = 0.38;
  let x = p.sx * R, y = p.sy * R, z = p.sz * R;
  const cy = Math.cos(ry), sy = Math.sin(ry);
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];
  const cx = Math.cos(rx), sx = Math.sin(rx);
  [y, z] = [y * cx - z * sx, y * sx + z * cx];
  const depth = (z / R + 1) / 2;
  o[0] = x; o[1] = y + 0.12; o[2] = z; o[3] = 0.55 + depth * 0.6; o[4] = 0.25 + depth * 0.75;
  return o;
}

const STATES = {
  burning,
  thinking: (p, t, o) => {
    sphere(p, t, o);
    const pulse = Math.sin(p.sy * 6 - t * 3); // rolling latitude glow
    o[3] *= 0.85 + 0.35 * Math.max(0, pulse);
    return o;
  },
  working: (p, t, o = []) => {
    if (p.seed < 0.16 && !p.edge) {
      // satellites, never taken from the outline, on three tilted orbits
      const ring = Math.floor(p.seed / 0.0534);
      const ang = t * (1.1 + ring * 0.35) * (ring % 2 ? -1 : 1) + p.seed2 * TAU;
      const R = 0.78 + ring * 0.07;
      let x = Math.cos(ang) * R, y = 0, z = Math.sin(ang) * R;
      const tx = [1.15, 0.5, -0.9][ring], tz = [0.35, -0.6, 0.2][ring];
      [y, z] = [y * Math.cos(tx) - z * Math.sin(tx), y * Math.sin(tx) + z * Math.cos(tx)];
      [x, y] = [x * Math.cos(tz) - y * Math.sin(tz), x * Math.sin(tz) + y * Math.cos(tz)];
      const d = (z / R + 1) / 2;
      o[0] = x; o[1] = y + 0.08; o[2] = z; o[3] = 0.5 + d * 0.8; o[4] = 0.3 + d * 0.7;
      return o;
    }
    const a = t * 2.4 * (0.6 + p.seed2) + p.seed * TAU, r = 0.018;
    o[0] = p.x + Math.cos(a) * r; o[1] = p.y + Math.sin(a) * r * 0.5; o[2] = p.z + Math.sin(a) * r;
    o[3] = 0.8 + 0.25 * Math.sin(a); o[4] = 0.9;
    return o;
  },
  searching: (p, t, o = []) => {
    const band = Math.sin(t * 1.5) * 0.85;
    const k = Math.exp(-Math.pow((p.x - band) / 0.075, 2));
    const ry = Math.sin(t * 0.75) * 0.55;
    const z = p.z + k * 0.14;
    o[0] = p.x * Math.cos(ry) + z * Math.sin(ry); o[1] = p.y; o[2] = -p.x * Math.sin(ry) + z * Math.cos(ry);
    o[3] = (p.edge ? 0.8 : 0.62) + k * 1.0; o[4] = (p.edge ? 0.6 : 0.36) + k * 0.6;
    return o;
  },
  listening: (p, t, o = []) => {
    const env = 0.55 + 0.45 * Math.sin(t * 1.4);
    const w = Math.sin(p.x * 8 - t * 5.5);
    o[0] = p.x; o[1] = p.y + w * 0.045 * env * (0.4 + p.h); o[2] = p.z;
    o[3] = 0.75 + 0.45 * (0.5 + 0.5 * w) * env; o[4] = 0.55 + 0.45 * (0.5 + 0.5 * w);
    return o;
  },
  breathing: (p, t, o = []) => {
    const w = Math.sin(p.hd * 9 - t * 2.6);
    const g = 1 + 0.025 * Math.sin(t * 1.3) + 0.018 * w;
    const hx = DATA.hole[0], hy = DATA.hole[1];
    o[0] = hx + (p.x - hx) * g; o[1] = hy + (p.y - hy) * g; o[2] = p.z;
    o[3] = 0.7 + 0.45 * (0.5 + 0.5 * w); o[4] = 0.6 + 0.4 * (0.5 + 0.5 * w);
    return o;
  },
  igniting: (() => {
    const A = [], B = [];
    return (p, t, o = []) => {
      const cyc = (t / 5.2) % 1; // orb → flame → hold → orb
      let m = cyc < 0.35 ? 0 : cyc < 0.55 ? (cyc - 0.35) / 0.2 : cyc < 0.85 ? 1 : 1 - (cyc - 0.85) / 0.15;
      const delay = (1 - p.h) * 0.45; // catches from the bottom up
      const lag = delay * (cyc < 0.6 ? 1 : 0);
      m = ease(clamp((m - lag) / (1 - lag), 0, 1));
      sphere(p, t, A);
      burning(p, t, B);
      for (let i = 0; i < 5; i++) o[i] = mix(A[i], B[i], m);
      return o;
    };
  })(),
};

export const FLAME_STATES = Object.keys(STATES);

/** "dark" | "light": the explicit choice, else the nearest [data-theme], else the OS. */
export function resolveTheme(el, pref) {
  if (pref === "dark" || pref === "light") return pref;
  const n = el.closest("[data-theme]");
  if (n) return n.getAttribute("data-theme") === "light" ? "light" : "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/**
 * Starts the animation on a square canvas sized by CSS.
 * opts: state, speed, colored, theme ("auto" | "dark" | "light"), paused,
 *       glow, detail ("sm" | "md" | "lg"), label.
 */
export function mountFlame(canvas, opts = {}) {
  let state = opts.state || "burning", prev = state, since = -10;
  let speed = opts.speed ?? 1, colored = opts.colored ?? true, themePref = opts.theme || "auto";
  let paused = !!opts.paused;
  const glow = opts.glow ?? true;
  const ctx = canvas.getContext("2d");
  let t = 0, last = performance.now(), raf = 0, W = 0, g = null, dpr = 1, onScreen = true;
  const A = [], B = [];

  function resize() {
    const css = canvas.clientWidth || opts.size || 64;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = css;
    canvas.width = Math.round(css * dpr);
    canvas.height = Math.round(css * dpr);
    g = grid(opts.detail || (css >= 150 ? "lg" : css >= 44 ? "md" : "sm"));
    draw();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!onScreen || document.hidden) return;
    if (!paused) t += dt * speed;
    draw();
  }

  function draw() {
    if (!g || !W) return;
    const dark = resolveTheme(canvas, themePref) === "dark";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, W);
    const k = W * 0.46, cx = W / 2, cy = W / 2 + W * 0.01;
    const fnA = STATES[prev], fnB = STATES[state];
    const tr = clamp((t - since) / 0.9, 0, 1.6);
    const base = g.s * k * 0.36;
    if (glow && dark && colored) {
      const rg = ctx.createRadialGradient(cx, cy + k * 0.2, 0, cx, cy + k * 0.2, k * 1.05);
      rg.addColorStop(0, "rgba(20,210,190,0.16)");
      rg.addColorStop(1, "rgba(20,210,190,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, W);
    }
    ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
    const ink = dark ? [226, 246, 242] : [14, 42, 48];
    const list = g.dots;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      let o;
      const kk = ease(clamp(tr - p.seed * 0.6, 0, 1)); // staggered hand-off between states
      if (kk >= 1 || prev === state) o = fnB(p, t, B);
      else {
        fnA(p, t, A);
        fnB(p, t, B);
        o = A;
        for (let j = 0; j < 5; j++) o[j] = mix(A[j], B[j], kk);
      }
      const f = 3.2 / (3.2 - o[2]);
      const x = cx + o[0] * k * f, y = cy + o[1] * k * f;
      const r = Math.max(0.35, base * o[3] * f);
      const al = clamp(o[4], 0, 1);
      if (al <= 0.01) continue;
      const c = colored ? [p.r, p.g, p.b] : ink;
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${al * (dark ? 0.92 : 1)})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver((e) => (onScreen = e[0].isIntersecting));
  io.observe(canvas);
  resize();
  raf = requestAnimationFrame(frame);
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", opts.label || "VERA");

  return {
    setState(s) {
      if (!STATES[s] || s === state) return;
      prev = state;
      state = s;
      since = t;
    },
    setSpeed(v) { speed = v; },
    setColored(v) { colored = v; draw(); },
    setTheme(v) { themePref = v; draw(); },
    setPaused(v) { paused = v; },
    get state() { return state; },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    },
  };
}
