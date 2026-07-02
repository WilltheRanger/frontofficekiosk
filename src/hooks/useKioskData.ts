import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Announcement, Building, KioskData, Photo, Room } from "../lib/types";
import { mockAnnouncements, mockBuildings, mockPhotos, mockRooms } from "../data/mock";
import { DATA_REFRESH_MS } from "../lib/config";

const CACHE_KEY = "kiosk-cache-v1";

interface CachePayload {
  photos: Photo[];
  announcements: Announcement[];
  buildings: Building[];
  rooms: Room[];
  savedAt: number;
}

function readCache(): CachePayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachePayload) : null;
  } catch {
    return null;
  }
}

function writeCache(payload: CachePayload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable — cache is best-effort (PLANNING §6.6).
  }
}

/** Loads kiosk content with a stale-while-revalidate posture:
 *  cached data renders immediately, network refreshes replace it silently,
 *  failures keep whatever is on screen, and per-resource mock fallbacks keep
 *  the kiosk demo-able before the backend pipeline exists. PLANNING §6.6. */
export function useKioskData(): KioskData & { refresh: () => void } {
  const cached = useRef(readCache());
  const [photos, setPhotos] = useState<Photo[]>(cached.current?.photos ?? mockPhotos);
  const [announcements, setAnnouncements] = useState<Announcement[]>(
    cached.current?.announcements ?? mockAnnouncements,
  );
  const [buildings, setBuildings] = useState<Building[]>(
    cached.current?.buildings ?? mockBuildings,
  );
  const [rooms, setRooms] = useState<Room[]>(cached.current?.rooms ?? mockRooms);
  const [usingMockData, setUsingMockData] = useState(!supabase);
  const inFlight = useRef(false);

  // Latest values readable inside refresh() without re-creating the callback.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const announcementsRef = useRef(announcements);
  announcementsRef.current = announcements;
  const buildingsRef = useRef(buildings);
  buildingsRef.current = buildings;
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;

  const refresh = useCallback(() => {
    if (!supabase || inFlight.current) return;
    inFlight.current = true;
    void (async () => {
      const [photoRes, annRes, bldgRes, roomRes] = await Promise.all([
        supabase
          .from("photos")
          .select("id, thumb_url, display_url, caption, width, height, drive_created_at")
          .order("drive_created_at", { ascending: false }),
        supabase
          .from("announcements")
          .select(
            "id, title, body, image_url, is_pinned, published_at, event_date, event_title, event_location",
          )
          .order("is_pinned", { ascending: false })
          .order("published_at", { ascending: false }),
        supabase.from("buildings").select("id, label, level").order("id"),
        supabase
          .from("rooms")
          .select("id, building_id, label, teacher:teachers!rooms_teacher_id_fkey(name)")
          .order("label"),
      ]);

      // Failure posture (PLANNING §6.6): an errored request keeps whatever is
      // currently shown — real content must never be replaced by samples
      // because of a network blip. Samples appear only when there is nothing
      // better: photos empty until the Drive→R2 pipeline is live, or wayfinding
      // tables unreachable AND nothing cached.
      let anyMock = false;

      let nextPhotos = photosRef.current;
      if (!photoRes.error) {
        if (photoRes.data.length > 0) {
          nextPhotos = photoRes.data as Photo[];
        } else {
          nextPhotos = mockPhotos; // expected-empty until the pipeline is on
          anyMock = true;
        }
      } else {
        anyMock = true;
      }

      // Announcements: an empty feed is a legitimate state — show it.
      let nextAnnouncements = announcementsRef.current;
      if (!annRes.error) {
        nextAnnouncements = annRes.data as Announcement[];
      } else {
        anyMock = true;
      }

      let nextBuildings = buildingsRef.current;
      if (!bldgRes.error && bldgRes.data.length > 0) {
        nextBuildings = bldgRes.data as Building[];
      } else if (bldgRes.error) {
        anyMock = true;
      }

      let nextRooms = roomsRef.current;
      if (!roomRes.error && roomRes.data.length > 0) {
        nextRooms = roomRes.data.map((r) => {
          const teacher = r.teacher as { name: string } | { name: string }[] | null;
          return {
            id: r.id as string,
            building_id: r.building_id as string,
            label: (r.label as string | null) ?? null,
            teacher_name: Array.isArray(teacher)
              ? (teacher[0]?.name ?? null)
              : (teacher?.name ?? null),
          };
        });
      } else if (roomRes.error) {
        anyMock = true;
      }

      setPhotos(nextPhotos);
      setAnnouncements(nextAnnouncements);
      setBuildings(nextBuildings);
      setRooms(nextRooms);
      setUsingMockData(anyMock);
      writeCache({
        photos: nextPhotos,
        announcements: nextAnnouncements,
        buildings: nextBuildings,
        rooms: nextRooms,
        savedAt: Date.now(),
      });
    })().finally(() => {
      inFlight.current = false;
    });
  }, []);

  useEffect(() => {
    refresh(); // boot
    const interval = window.setInterval(refresh, DATA_REFRESH_MS); // backstop
    window.addEventListener("online", refresh); // recover after outages
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", refresh);
    };
  }, [refresh]);

  return { photos, announcements, buildings, rooms, usingMockData, refresh };
}
