import type { Announcement, Building, Photo, Room } from "../lib/types";

/** Bundled sample content — used when Supabase env vars are absent or a table
 * isn't reachable yet (e.g. photos before the Drive→R2 pipeline goes live).
 * Placeholder images live in /public/placeholders (generated SVGs). */

const captions = [
  "Brahmas take the field — Friday night lights",
  "Homecoming 2025 — Brahma Nation in full color",
  "AP Art Showcase in the 900s gallery",
  "Marching Brahmas at the Diamond Bar parade",
  null,
  "Club Rush on the upper quad",
  "Senior sunrise, September 2025",
  null,
];

export const mockPhotos: Photo[] = captions.map((caption, i) => ({
  id: `mock-photo-${i + 1}`,
  thumb_url: `${import.meta.env.BASE_URL}placeholders/photo-0${i + 1}.svg`,
  display_url: `${import.meta.env.BASE_URL}placeholders/photo-0${i + 1}.svg`,
  caption,
  width: 1600,
  height: 1000,
  drive_created_at: new Date(Date.UTC(2026, 5, 20 - i)).toISOString(),
}));

export const mockAnnouncements: Announcement[] = [
  {
    id: "mock-ann-1",
    title: "Welcome to Brahma Country!",
    body: "Stop by the front office window for visitor badges, campus tours, and enrollment questions. Go Brahmas!",
    image_url: null,
    is_pinned: true,
    published_at: new Date(Date.UTC(2026, 6, 1)).toISOString(),
    event_date: null,
    event_title: null,
    event_location: null,
  },
  {
    id: "mock-ann-2",
    title: "Back to School Night",
    body: "Meet your student's teachers and walk their schedule. Doors open at 6:00 PM in the gym.",
    image_url: null,
    is_pinned: false,
    published_at: new Date(Date.UTC(2026, 5, 28)).toISOString(),
    event_date: new Date(Date.UTC(2026, 7, 19, 1, 30)).toISOString(),
    event_title: "Back to School Night",
    event_location: "Diamond Bar High School — Main Gym",
  },
  {
    id: "mock-ann-3",
    title: "Fall sports physicals",
    body: "Athletic clearance packets are due before the first practice. Pick one up in the athletics office (500s building).",
    image_url: null,
    is_pinned: false,
    published_at: new Date(Date.UTC(2026, 5, 24)).toISOString(),
    event_date: null,
    event_title: null,
    event_location: null,
  },
];

/** Matches the real dbhs-wayfinder building ids so DB-backed and mock modes
 * light up the same schematic map shapes. */
export const mockBuildings: Building[] = [
  { id: "bldg-200", label: "200s Building", level: 0 },
  { id: "bldg-300", label: "300s Building", level: 0 },
  { id: "bldg-400", label: "400s Building", level: 0 },
  { id: "bldg-500", label: "500s Building", level: 0 },
  { id: "bldg-600", label: "600s Building", level: 0 },
  { id: "bldg-900", label: "900s — Theater & Arts", level: 0 },
  { id: "bldg-1100", label: "1100s Building", level: 0 },
];

const mockTeacherNames = [
  "Ms. Alvarez", "Mr. Chen", "Mrs. Okafor", "Mr. Nakamura", "Ms. Patel",
  "Mr. Romero", "Mrs. Kim", "Ms. Delgado", "Mr. Whitfield", "Mrs. Liu",
];

export const mockRooms: Room[] = mockBuildings.flatMap((b, bi) => {
  const base = Number(b.id.replace("bldg-", ""));
  return Array.from({ length: 6 }, (_, i) => ({
    id: `mock-room-${base + i + 1}`,
    building_id: b.id,
    label: String(base + i + 1),
    teacher_name: mockTeacherNames[(bi * 3 + i) % mockTeacherNames.length] ?? null,
  }));
});
