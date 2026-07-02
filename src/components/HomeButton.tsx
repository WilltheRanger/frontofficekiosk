import { House } from "lucide-react";

/** Persistent ⌂ Home affordance, bottom-left on all content screens (§6.2). */
export function HomeButton({ onHome }: { onHome: () => void }) {
  return (
    <button
      type="button"
      onClick={onHome}
      data-testid="home-button"
      className="pressable fixed bottom-6 left-6 z-40 flex h-[72px] min-w-[120px] items-center gap-3 rounded-2xl border-2 border-gold-500 bg-brahma-600 px-6 text-2xl font-semibold text-white shadow-lg"
    >
      <House className="h-8 w-8 text-gold-300" aria-hidden="true" />
      Home
    </button>
  );
}
