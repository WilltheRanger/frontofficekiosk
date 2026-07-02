/** Kiosk navigation state machine — PLANNING §6.4. No router: a kiosk has no
 * URLs, no history, no deep links. One enum, one reducer, exhaustive table. */

export type Screen = "attract" | "home" | "gallery" | "viewer" | "map" | "announcements";

export interface KioskState {
  screen: Screen;
  /** Gallery index the viewer opened at; null when the viewer is closed. */
  viewerIndex: number | null;
}

export type KioskEvent =
  | { type: "WAKE" }
  | { type: "SELECT_TILE"; tile: "gallery" | "map" | "announcements" }
  | { type: "OPEN_PHOTO"; index: number }
  | { type: "CLOSE_VIEWER" }
  | { type: "GO_HOME" }
  | { type: "IDLE_TIMEOUT" };

export const initialKioskState: KioskState = { screen: "attract", viewerIndex: null };

export function kioskReducer(state: KioskState, event: KioskEvent): KioskState {
  switch (event.type) {
    case "WAKE":
      return state.screen === "attract" ? { screen: "home", viewerIndex: null } : state;

    case "SELECT_TILE":
      return state.screen === "home" ? { screen: event.tile, viewerIndex: null } : state;

    case "OPEN_PHOTO":
      return state.screen === "gallery"
        ? { screen: "viewer", viewerIndex: event.index }
        : state;

    case "CLOSE_VIEWER":
      return state.screen === "viewer" ? { screen: "gallery", viewerIndex: null } : state;

    case "GO_HOME":
      return state.screen === "attract" || state.screen === "home"
        ? state
        : { screen: "home", viewerIndex: null };

    case "IDLE_TIMEOUT":
      // Global reset: per-screen state (map selection, scroll, open photo)
      // lives in the screen components, which unmount on this transition.
      return state.screen === "attract" ? state : { screen: "attract", viewerIndex: null };
  }
}

/** Events that navigate (debounced after transitions — palm-slap guard §6.4). */
export function isNavigationEvent(event: KioskEvent): boolean {
  return event.type !== "IDLE_TIMEOUT";
}
