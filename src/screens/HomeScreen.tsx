import { Images, MapPin, Megaphone, type LucideIcon } from "lucide-react";
import { KioskHeader } from "../components/KioskHeader";

function MenuTile({
  icon: Icon,
  label,
  onSelect,
  testId,
}: {
  icon: LucideIcon;
  label: string;
  onSelect: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={testId}
      className="pressable flex h-[340px] w-[300px] flex-col items-center justify-center gap-8 rounded-3xl border-2 border-gold-500 bg-brahma-700 shadow-xl"
    >
      <Icon className="h-24 w-24 text-white" strokeWidth={1.75} aria-hidden="true" />
      <span className="h-px w-16 bg-gold-500" aria-hidden="true" />
      <span className="font-display text-3xl font-bold text-white">{label}</span>
    </button>
  );
}

/** S1 — Home menu: three large tiles per the approved mockup (§6.2). */
export function HomeScreen({
  onSelect,
}: {
  onSelect: (tile: "gallery" | "map" | "announcements") => void;
}) {
  return (
    <div className="screen-enter flex h-screen flex-col bg-surface" data-testid="home-screen">
      <KioskHeader />
      <main className="flex flex-1 items-center justify-center gap-14">
        <MenuTile
          icon={Images}
          label="View Photos"
          testId="tile-gallery"
          onSelect={() => onSelect("gallery")}
        />
        <MenuTile
          icon={MapPin}
          label="Find a Room"
          testId="tile-map"
          onSelect={() => onSelect("map")}
        />
        <MenuTile
          icon={Megaphone}
          label="Announcements"
          testId="tile-announcements"
          onSelect={() => onSelect("announcements")}
        />
      </main>
      <footer className="flex items-center justify-center gap-5 pb-10">
        <span className="h-px w-28 bg-gold-500" />
        <span className="font-display text-xl font-bold tracking-[0.3em] text-ink-muted">
          HOME OF THE BRAHMAS
        </span>
        <span className="h-px w-28 bg-gold-500" />
      </footer>
    </div>
  );
}
