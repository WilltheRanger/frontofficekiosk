import type { Photo } from "../lib/types";
import { ScreenHeader } from "../components/ScreenHeader";

/** S2 — tap-friendly photo grid; thumbs only, newest first (§6.2). */
export function GalleryScreen({
  photos,
  onOpenPhoto,
  onBack,
}: {
  photos: Photo[];
  onOpenPhoto: (index: number) => void;
  onBack: () => void;
}) {
  return (
    <div className="screen-enter flex h-screen flex-col bg-surface" data-testid="gallery-screen">
      <ScreenHeader title="Photos" onBack={onBack} />
      {photos.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="rounded-2xl bg-white px-10 py-8 text-2xl text-ink-muted shadow">
            New photos are on their way — check back soon!
          </p>
        </div>
      ) : (
        <div
          className="grid flex-1 grid-cols-4 content-start gap-4 overflow-y-auto p-6 pb-28"
          style={{ overscrollBehavior: "contain" }}
        >
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => onOpenPhoto(index)}
              data-testid={`photo-thumb-${index}`}
              className="pressable overflow-hidden rounded-2xl bg-white shadow"
              style={{
                aspectRatio:
                  photo.width && photo.height ? `${photo.width} / ${photo.height}` : "3 / 2",
              }}
            >
              <img
                src={photo.thumb_url}
                alt={photo.caption ?? "School photo"}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
