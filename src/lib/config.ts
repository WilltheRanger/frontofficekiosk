/** Tunable kiosk behavior — defaults per PLANNING.md Decisions Register. */

const params = new URLSearchParams(window.location.search);

/** D2 — return to Attract after this much inactivity. `?idle=5000` overrides (testing). */
export const IDLE_TIMEOUT_MS = Number(params.get("idle")) || 45_000;

/** D6 — Attract carousel dwell per photo. */
export const ATTRACT_DWELL_MS = Number(params.get("dwell")) || 8_000;

/** §6.6 — background data refresh backstop. */
export const DATA_REFRESH_MS = 10 * 60_000;

/** §6.4 — ignore navigation events this soon after a transition (palm slap guard). */
export const TRANSITION_DEBOUNCE_MS = 300;

/** Injected by vite.config.ts; "dev" during `vite dev`. */
export const BUILD_ID: string = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";
