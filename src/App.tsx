import { useCallback, useEffect, useReducer, useRef } from "react";
import { initialKioskState, isNavigationEvent, kioskReducer, type KioskEvent } from "./state/machine";
import { useIdleTimer } from "./hooks/useIdleTimer";
import { useKioskData } from "./hooks/useKioskData";
import { BUILD_ID, IDLE_TIMEOUT_MS, TRANSITION_DEBOUNCE_MS } from "./lib/config";
import { AttractScreen } from "./screens/AttractScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { GalleryScreen } from "./screens/GalleryScreen";
import { PhotoViewer } from "./screens/PhotoViewer";
import { MapScreen } from "./screens/MapScreen";
import { AnnouncementsScreen } from "./screens/AnnouncementsScreen";
import { HomeButton } from "./components/HomeButton";

/** Reloads the kiosk when a new build ships (PLANNING §9.4). Production only —
 * dev servers would loop. Checked on every entry into Attract. */
async function checkForNewBuild() {
  if (!import.meta.env.PROD) return;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const { build } = (await res.json()) as { build?: string };
    if (build && build !== BUILD_ID) window.location.reload();
  } catch {
    // Offline or hosting hiccup — try again next idle cycle.
  }
}

export default function App() {
  const [state, dispatch] = useReducer(kioskReducer, initialKioskState);
  const { photos, announcements, buildings, rooms, refresh } = useKioskData();
  const lastTransition = useRef(0);

  // Palm-slap guard (§6.4): one physical touch can fire several pointer
  // events; ignore navigation events fired right after a transition.
  const send = useCallback((event: KioskEvent) => {
    const now = Date.now();
    if (isNavigationEvent(event) && now - lastTransition.current < TRANSITION_DEBOUNCE_MS) return;
    lastTransition.current = now;
    dispatch(event);
  }, []);

  useIdleTimer(IDLE_TIMEOUT_MS, () => send({ type: "IDLE_TIMEOUT" }), state.screen !== "attract");

  // Entering Attract = "between visitors": refresh content + check for updates.
  useEffect(() => {
    if (state.screen === "attract") {
      refresh();
      void checkForNewBuild();
    }
  }, [state.screen, refresh]);

  const goHome = useCallback(() => send({ type: "GO_HOME" }), [send]);

  switch (state.screen) {
    case "attract":
      return <AttractScreen photos={photos} onWake={() => send({ type: "WAKE" })} />;
    case "home":
      return <HomeScreen onSelect={(tile) => send({ type: "SELECT_TILE", tile })} />;
    case "gallery":
      return (
        <>
          <GalleryScreen
            photos={photos}
            onOpenPhoto={(index) => send({ type: "OPEN_PHOTO", index })}
            onBack={goHome}
          />
          <HomeButton onHome={goHome} />
        </>
      );
    case "viewer":
      return (
        <PhotoViewer
          photos={photos}
          startIndex={state.viewerIndex ?? 0}
          onClose={() => send({ type: "CLOSE_VIEWER" })}
        />
      );
    case "map":
      return (
        <>
          <MapScreen rooms={rooms} buildings={buildings} onBack={goHome} />
          <HomeButton onHome={goHome} />
        </>
      );
    case "announcements":
      return (
        <>
          <AnnouncementsScreen announcements={announcements} onBack={goHome} />
          <HomeButton onHome={goHome} />
        </>
      );
  }
}
