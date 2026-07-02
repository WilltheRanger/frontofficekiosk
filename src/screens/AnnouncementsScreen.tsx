import { CalendarDays, MapPin, Pin } from "lucide-react";
import type { Announcement } from "../lib/types";
import { formatEventDate, formatPostedDate } from "../lib/format";
import { ScreenHeader } from "../components/ScreenHeader";

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  return (
    <article className="rounded-3xl border border-[#e5e1da] bg-white p-8 shadow-sm">
      {announcement.image_url && (
        <img
          src={announcement.image_url}
          alt=""
          loading="lazy"
          className="mb-6 max-h-72 w-full rounded-2xl object-cover"
        />
      )}
      <div className="flex items-start gap-4">
        <h2 className="flex-1 font-display text-[28px] font-bold leading-snug text-brahma-600">
          {announcement.title}
        </h2>
        {announcement.is_pinned && (
          <span className="flex items-center gap-1.5 rounded-full bg-gold-500 px-4 py-1.5 text-sm font-bold tracking-wider text-brahma-900">
            <Pin className="h-4 w-4" aria-hidden="true" /> PINNED
          </span>
        )}
      </div>
      <p className="mt-3 whitespace-pre-line text-[22px] leading-relaxed text-ink">
        {announcement.body}
      </p>
      {(announcement.event_date ?? announcement.event_location) && (
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 rounded-2xl bg-surface px-6 py-4 text-[20px] font-medium text-brahma-600">
          {announcement.event_date && (
            <span className="flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-gold-700" aria-hidden="true" />
              {formatEventDate(announcement.event_date)}
            </span>
          )}
          {announcement.event_location && (
            <span className="flex items-center gap-2">
              <MapPin className="h-6 w-6 text-gold-700" aria-hidden="true" />
              {announcement.event_location}
            </span>
          )}
        </div>
      )}
      <p className="mt-4 text-lg text-ink-muted">{formatPostedDate(announcement.published_at)}</p>
    </article>
  );
}

/** S5 — scrollable feed of announcement cards, pinned first (§6.2). */
export function AnnouncementsScreen({
  announcements,
  onBack,
}: {
  announcements: Announcement[];
  onBack: () => void;
}) {
  return (
    <div
      className="screen-enter flex h-screen flex-col bg-surface"
      data-testid="announcements-screen"
    >
      <ScreenHeader title="Announcements" onBack={onBack} />
      <div
        className="flex-1 overflow-y-auto px-6 pb-28 pt-8"
        style={{ overscrollBehavior: "contain" }}
      >
        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6">
          {announcements.length === 0 ? (
            <p className="rounded-3xl bg-white px-10 py-12 text-center text-2xl text-ink-muted shadow-sm">
              No announcements right now — check back soon!
            </p>
          ) : (
            announcements.map((a) => <AnnouncementCard key={a.id} announcement={a} />)
          )}
        </div>
      </div>
    </div>
  );
}
