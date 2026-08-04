import { useEffect, useRef } from "react";

/** Fires `onIdle` after `timeoutMs` with no touch/pointer/wheel/key activity.
 * Any activity re-arms the timer. Disabled (e.g. on Attract) it does nothing.
 * PLANNING §6.5. */
export function useIdleTimer(timeoutMs: number, onIdle: () => void, enabled: boolean) {
  const idleRef = useRef(onIdle);
  idleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return;
    let timer: number;
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => idleRef.current(), timeoutMs);
    };
    const events = ["pointerdown", "pointermove", "wheel", "keydown"] as const;
    for (const name of events) window.addEventListener(name, arm, { passive: true });
    arm();
    return () => {
      window.clearTimeout(timer);
      for (const name of events) window.removeEventListener(name, arm);
    };
  }, [timeoutMs, enabled]);
}
