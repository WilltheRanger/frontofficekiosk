/** Row shapes the kiosk reads. Photos/sync per PLANNING §4.2; announcements and
 * wayfinding tables match the existing dbhs-wayfinder schema (shared project). */

export interface Photo {
  id: string;
  thumb_url: string;
  display_url: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  drive_created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  is_pinned: boolean;
  published_at: string;
  /** Optional event block (existing dbhs-wayfinder columns) */
  event_date: string | null;
  event_title: string | null;
  event_location: string | null;
}

export interface Building {
  id: string;
  label: string;
  level: number;
}

export interface Room {
  id: string;
  building_id: string;
  label: string | null;
  teacher_name: string | null;
}

export interface KioskData {
  photos: Photo[];
  announcements: Announcement[];
  buildings: Building[];
  rooms: Room[];
  /** True when any resource fell back to bundled sample data. */
  usingMockData: boolean;
}
