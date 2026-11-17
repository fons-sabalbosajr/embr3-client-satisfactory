import { useEffect, useLayoutEffect, useRef } from "react";
import { loadBeam, loadFlame, prefersReducedMotion } from "./veraEngines";

// ---------------------------------------------------------------------------
// React wrappers for VERA's two canvas animations: the dotted flame
// (engine/veraFlame.js) and the border beam (engine/veraBeam.js). Ported from
// the EMBR3 UCDS VERA module so both apps carry the same VERA.
//
// The engines and their outline data are loaded on first use, in their own
// chunk, so a page that never shows VERA does not download them. Until the
// chunk arrives the canvas is simply empty, at its final size, so nothing
// shifts when it starts drawing.
//
// `theme` is the surface the mark sits on ("dark" | "light"); "auto" falls
// back to the nearest [data-theme], then the operating system.
// ---------------------------------------------------------------------------

/** Mounts an engine on the canvas once, then forwards prop changes through `sync`. */
function useEngine(load, mountName, initial, sync, deps) {
  const canvasRef = useRef(null);
  const handleRef = useRef(null);
  const latest = useRef(initial);
  // Kept current after every render (not during it), ahead of the effects
  // below that read it.
  useLayoutEffect(() => {
    latest.current = initial;
  });

  useEffect(() => {
    let cancelled = false;
    load().then((mod) => {
      if (cancelled || !canvasRef.current) return;
      handleRef.current = mod[mountName](canvasRef.current, { ...latest.current, paused: prefersReducedMotion() });
    });
    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (handleRef.current) sync(handleRef.current, latest.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return canvasRef;
}

/**
 * The animated dotted flame.
 * state: burning | thinking | working | searching | listening | breathing | igniting
 */
export function VeraFlame({ size = 32, state = "burning", theme = "auto", colored = true, glow = true, label = "VERA", className = "", style }) {
  const ref = useEngine(
    loadFlame,
    "mountFlame",
    { state, theme, colored, glow, label, size },
    (h, o) => {
      h.setState(o.state);
      h.setTheme(o.theme);
      h.setColored(o.colored);
    },
    [state, theme, colored],
  );
  return (
    <canvas
      ref={ref}
      className={["vera-mark", className].filter(Boolean).join(" ")}
      style={{ width: size, height: size, ...style }}
      width={size}
      height={size}
    />
  );
}

/**
 * A border beam running round the rounded edge of its parent — the launcher
 * pill, a card. Place it as the first child of an element with
 * position: relative (or fixed); it overlays that element, reaching `pad`
 * pixels beyond it so the bloom has room, and never takes a click.
 * radius: the parent's corner radius in pixels, or "pill".
 * type: rotate | line | pulse-inner | pulse-outside
 * color: a named palette ("vera") or a hex colour, usually the app's accent.
 */
export function VeraEdgeBeam({ radius = "pill", pad = 10, border = 0, type = "rotate", color = "vera", active = true, theme = "auto", strength = 1, speed = 1 }) {
  const ref = useEngine(
    loadBeam,
    "mountBeam",
    { shape: "rect", rect: { inset: pad, radius, tight: true }, type, color, active, theme, strength, speed },
    (h, o) => h.set(o),
    [radius, pad, type, color, active, theme, strength, speed],
  );
  // An absolutely-positioned child is placed against its parent's PADDING box,
  // which sits inside the border. Without `border` the beam ran 1px inside the
  // button's outline all the way round — a ring visibly smaller than the
  // button. Pushing out by the border width puts the path ON the outline.
  //
  // A canvas does not stretch between its offsets the way a div does, so the
  // size is given outright: the parent's plus the pad (and border) on each side.
  const off = pad + border;
  const grow = `calc(100% + ${off * 2}px)`;
  // `maxWidth/maxHeight: none` is load-bearing. index.css has a responsive
  // safety net — `canvas { max-width: 100% }` — and this canvas is deliberately
  // WIDER than its parent (the pad on each side). Clamped to 100% it kept its
  // -pad left offset but lost the extra width, so the whole beam was squeezed
  // horizontally and shifted left of the button, with its right end cut off.
  // Inline, so no stylesheet on any page can clamp it again.
  return (
    <canvas
      ref={ref}
      className="vera-edge-beam"
      style={{ top: -off, left: -off, width: grow, height: grow, maxWidth: "none", maxHeight: "none" }}
    />
  );
}
