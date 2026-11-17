// Lazy loaders for VERA's canvas engines (the dotted flame and the border
// beam), shared by VeraMark and VeraFlameIcon. Each engine and its outline data
// is fetched once, on first use, in its own chunk — a page that never shows
// VERA never downloads them.

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

let flameEngine = null;
export const loadFlame = () => (flameEngine ||= import("./engine/veraFlame"));

let beamEngine = null;
export const loadBeam = () => (beamEngine ||= import("./engine/veraBeam"));
