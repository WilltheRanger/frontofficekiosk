/** Placeholder Brahma bull mark — geometric horns + head, gold on transparent.
 * Swap for the official school vector when it arrives (PLANNING Q8). */
export function BrahmaMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="none">
      {/* horns */}
      <path
        d="M6 22c0-8 6-14 14-14-3 4-4 8-3 12 2-2 5-3 8-3h14c3 0 6 1 8 3 1-4 0-8-3-12 8 0 14 6 14 14 0 5-3 9-7 11H13c-4-2-7-6-7-11Z"
        fill="currentColor"
        opacity="0.95"
      />
      {/* head */}
      <path
        d="M20 30h24l-2 12c-1 6-5 10-10 14-5-4-9-8-10-14l-2-12Z"
        fill="currentColor"
      />
      {/* eyes (knockout) */}
      <circle cx="26" cy="36" r="2.4" fill="var(--color-brahma-700)" />
      <circle cx="38" cy="36" r="2.4" fill="var(--color-brahma-700)" />
    </svg>
  );
}
