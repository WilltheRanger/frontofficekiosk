import { useEffect, useMemo, useRef, useState } from "react";
import { Pointer } from "lucide-react";
import type { Photo } from "../lib/types";
import { ATTRACT_DWELL_MS } from "../lib/config";
import { BrahmaMark } from "../components/BrahmaMark";

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

interface Slide {
  key: number;
  photo: Photo;
  kenburns: "kenburns-a" | "kenburns-b";
}

/** S0 — ambient full-bleed carousel; any touch wakes to Home (§6.2). */
export function AttractScreen({ photos, onWake }: { photos: Photo[]; onWake: () => void }) {
  // One shuffled playlist per entry into Attract (D6).
  const playlist = useMemo(() => shuffled(photos), [photos]);
  const cursor = useRef(0);
  const [slides, setSlides] = useState<Slide[]>(() =>
    playlist.length > 0 ? [{ key: 0, photo: playlist[0]!, kenburns: "kenburns-a" }] : [],
  );

  useEffect(() => {
    if (playlist.length < 2) return;
    // Preload the upcoming image so the crossfade never reveals a blank layer.
    const preload = (i: number) => {
      const img = new Image();
      img.src = playlist[i % playlist.length]!.display_url;
    };
    preload(1);
    const timer = window.setInterval(() => {
      cursor.current += 1;
      const next = playlist[cursor.current % playlist.length]!;
      setSlides((prev) => {
        const key = (prev[prev.length - 1]?.key ?? 0) + 1;
        const kenburns = key % 2 === 0 ? "kenburns-a" : "kenburns-b";
        // Keep at most two layers: outgoing (below) + incoming (fading in).
        return [...prev.slice(-1), { key, photo: next, kenburns }];
      });
      preload(cursor.current + 1);
    }, ATTRACT_DWELL_MS);
    return () => window.clearInterval(timer);
  }, [playlist]);

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-brahma-900"
      onPointerDown={onWake}
      data-testid="attract-screen"
    >
      {slides.map((slide, i) => (
        <div key={slide.key} className={`absolute inset-0 ${i > 0 ? "attract-layer-in" : ""}`}>
          <img
            src={slide.photo.display_url}
            alt=""
            className="h-full w-full object-cover"
            style={{ animation: `${slide.kenburns} ${ATTRACT_DWELL_MS + 2000}ms linear both` }}
          />
        </div>
      ))}

      {/* scrims for legibility over any photo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-brahma-900/80 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-brahma-900/85 to-transparent" />

      {/* lockup */}
      <div className="pointer-events-none absolute inset-x-0 top-10 flex items-center justify-center gap-6">
        <BrahmaMark className="h-20 w-20 text-gold-500 drop-shadow-lg" />
        <div className="font-display leading-tight drop-shadow-lg">
          <div className="text-5xl font-extrabold tracking-[0.08em] text-white">
            DIAMOND BAR
          </div>
          <div className="mt-1 flex items-center gap-3">
            <span className="h-px w-10 bg-gold-500" />
            <span className="text-2xl font-bold tracking-[0.3em] text-gold-300">
              HIGH SCHOOL
            </span>
            <span className="h-px w-10 bg-gold-500" />
          </div>
        </div>
      </div>

      {/* call to action */}
      <div className="pointer-events-none absolute inset-x-0 bottom-14 flex items-center justify-center gap-5">
        <span className="h-px w-24 bg-gold-500/80" />
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold-500 bg-brahma-900/60">
          <Pointer className="h-8 w-8 text-gold-300" aria-hidden="true" />
        </span>
        <span className="font-display text-2xl font-bold tracking-[0.25em] text-white">
          TOUCH ANYWHERE TO <span className="text-gold-300">EXPLORE</span>
        </span>
        <span className="h-px w-24 bg-gold-500/80" />
      </div>
    </div>
  );
}
