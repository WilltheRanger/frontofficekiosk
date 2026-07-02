import { ChevronLeft } from "lucide-react";
import { BrahmaMark } from "./BrahmaMark";

/** Shared header for content screens: big back target, title, small mark. */
export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="flex items-center gap-6 bg-brahma-700 px-8 py-4">
      <button
        type="button"
        onClick={onBack}
        className="pressable flex h-[72px] min-w-[120px] items-center gap-1 rounded-xl border border-gold-500/70 bg-brahma-600 px-5 text-2xl font-semibold text-white"
      >
        <ChevronLeft className="h-8 w-8 text-gold-300" aria-hidden="true" />
        Back
      </button>
      <h1 className="font-display text-4xl font-extrabold tracking-wide text-white">
        {title}
      </h1>
      <div className="ml-auto flex items-center gap-3">
        <BrahmaMark className="h-12 w-12 text-gold-500" />
      </div>
    </header>
  );
}
