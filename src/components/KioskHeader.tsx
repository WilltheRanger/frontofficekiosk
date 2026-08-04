import { BrahmaMark } from "./BrahmaMark";

/** Purple brand bar used on the Home screen (mockup: logo left, lockup beside). */
export function KioskHeader() {
  return (
    <header className="flex items-center gap-6 bg-brahma-700 px-12 py-6">
      <BrahmaMark className="h-16 w-16 text-gold-500" />
      <div className="h-14 w-px bg-gold-500/60" aria-hidden="true" />
      <div className="font-display leading-tight">
        <div className="text-4xl font-extrabold tracking-[0.08em] text-white">
          DIAMOND BAR
        </div>
        <div className="text-xl font-bold tracking-[0.3em] text-gold-300">
          HIGH SCHOOL
        </div>
      </div>
    </header>
  );
}
