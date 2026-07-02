import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Photo } from "../lib/types";

/** S3 — full-screen swipeable viewer over the gallery (§6.2). */
export function PhotoViewer({
  photos,
  startIndex,
  onClose,
}: {
  photos: Photo[];
  startIndex: number;
  onClose: () => void;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ startIndex, loop: false });
  const [index, setIndex] = useState(startIndex);
  const [controlsVisible, setControlsVisible] = useState(true);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const current = photos[index];

  return (
    <div className="screen-enter fixed inset-0 z-50 bg-black" data-testid="photo-viewer">
      <div
        className="h-full w-full overflow-hidden"
        ref={emblaRef}
        onClick={() => setControlsVisible((v) => !v)}
      >
        <div className="flex h-full">
          {photos.map((photo) => (
            <div key={photo.id} className="flex h-full min-w-0 flex-[0_0_100%] items-center justify-center">
              <img
                src={photo.display_url}
                alt={photo.caption ?? "School photo"}
                className="max-h-full max-w-full object-contain"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {controlsVisible && (
        <>
          <button
            type="button"
            onClick={onClose}
            data-testid="viewer-close"
            className="pressable absolute right-6 top-6 flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-2 border-gold-500 bg-brahma-700/90 text-white"
            aria-label="Close photo"
          >
            <X className="h-9 w-9" />
          </button>

          {index > 0 && (
            <button
              type="button"
              onClick={prev}
              className="pressable absolute left-5 top-1/2 flex h-[88px] w-[72px] -translate-y-1/2 items-center justify-center rounded-2xl bg-brahma-900/70 text-white"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-12 w-12" />
            </button>
          )}
          {index < photos.length - 1 && (
            <button
              type="button"
              onClick={next}
              className="pressable absolute right-5 top-1/2 flex h-[88px] w-[72px] -translate-y-1/2 items-center justify-center rounded-2xl bg-brahma-900/70 text-white"
              aria-label="Next photo"
            >
              <ChevronRight className="h-12 w-12" />
            </button>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-black/85 to-transparent px-10 pb-6 pt-16">
            {current?.caption && (
              <p className="max-w-[80%] truncate text-[22px] text-white">{current.caption}</p>
            )}
            <p className="text-lg font-medium text-white/70">
              {index + 1} / {photos.length}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
