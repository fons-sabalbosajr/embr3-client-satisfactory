// VERA mark (React).
//
// The single VERA icon used on every surface — launcher, chat header, thinking
// indicator, dashboard card, notifications, onboarding, landing avatar. It
// renders the dotted flame from the EMBR3 UCDS VERA design
// (components/vera/engine/veraFlame.js), so VERA looks the same in both apps.
//
// Usage:
//   <VeraFlameIcon size={24} />                      // idle mark
//   <VeraFlameIcon size={16} state="thinking" />     // busy: gathers into the orb
//   <VeraFlameIcon size={56} anime />                // hero idle (glow)
//   <VeraFlameIcon size={64} tile theme="dark" />    // app-icon tile
//
// Props (unchanged from the previous mark, so no caller had to change)
//   size      px, square                                    (20)
//   state     idle | thinking | working | searching | listening | success
//             — or any flame state (burning, breathing, igniting) directly
//   anime     hero treatment for large, prominent placements (false)
//   animated  false → a still mark (lists, menus)            (true)
//   tile      draw the app-icon tile behind the mark          (false)
//   theme     "light" | "dark" — the surface it sits on      ("light")
//   title     accessible name; omitted → decorative (aria-hidden)
//   hero      legacy alias of `anime` (older OCSM call sites)

import { useEffect, useLayoutEffect, useRef } from "react";
import { loadFlame, prefersReducedMotion } from "./veraEngines";

// The previous mark's state names, mapped onto the flame's.
const STATE_MAP = {
  idle: "burning",
  success: "breathing",
  thinking: "thinking",
  working: "working",
  searching: "searching",
  listening: "listening",
  burning: "burning",
  breathing: "breathing",
  igniting: "igniting",
};

const TILE = {
  light: { background: "#FFFFFF", boxShadow: "inset 0 0 0 1px rgba(13,43,49,0.10)" },
  dark: { background: "#0D2B31", boxShadow: "inset 0 0 0 1px rgba(221,245,240,0.10)" },
};

export default function VeraFlameIcon({
  size = 20,
  state = "idle",
  anime: animeProp = false,
  hero = false,
  animated = true,
  tile = false,
  theme = "light",
  className = "",
  title,
}) {
  const anime = animeProp || hero;
  const canvasRef = useRef(null);
  const handleRef = useRef(null);
  const flameState = STATE_MAP[state] || "burning";
  const still = !animated || prefersReducedMotion();
  const latest = useRef({ flameState, theme, still });
  useLayoutEffect(() => {
    latest.current = { flameState, theme, still };
  });

  // A paused flame never advances its clock, so a state change while still
  // would freeze mid-hand-off. Remount instead whenever it is still.
  const mountKey = still ? `still:${flameState}` : "live";

  useEffect(() => {
    let cancelled = false;
    loadFlame().then((mod) => {
      if (cancelled || !canvasRef.current) return;
      const o = latest.current;
      handleRef.current = mod.mountFlame(canvasRef.current, {
        state: o.flameState,
        theme: o.theme,
        glow: anime,
        paused: o.still,
        label: title || "VERA",
        size,
      });
    });
    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountKey, anime]);

  useEffect(() => {
    handleRef.current?.setState(flameState);
  }, [flameState]);

  useEffect(() => {
    handleRef.current?.setTheme(theme);
  }, [theme]);

  // The mark inside a tile is drawn a little smaller so the tile reads as a
  // frame around it, as an app icon does.
  const markSize = tile ? Math.round(size * 0.78) : size;

  return (
    <span
      className={`vera-flame${className ? ` ${className}` : ""}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 0,
        width: size,
        height: size,
        flex: "none",
        ...(tile ? { ...TILE[theme === "dark" ? "dark" : "light"], borderRadius: Math.round(size * 0.24) } : null),
      }}
      aria-hidden={title ? undefined : true}
    >
      <canvas
        key={mountKey}
        ref={canvasRef}
        width={markSize}
        height={markSize}
        style={{ width: markSize, height: markSize, display: "block" }}
      />
    </span>
  );
}
