import { useMemo, useState } from "react";
import { GraduationCap, MapPin, X } from "lucide-react";
import type { Building, Room } from "../lib/types";
import { ScreenHeader } from "../components/ScreenHeader";
import { CampusMap } from "../map/CampusMap";
import { ROUTE_HINTS } from "../map/campus";

type FinderTab = "rooms" | "teachers";

function shortLabel(buildingId: string): string {
  return buildingId.replace("bldg-", "") + "s";
}

function surnameInitial(name: string): string {
  const tokens = name.trim().split(/\s+/);
  const last = tokens[tokens.length - 1] ?? "";
  return (last[0] ?? "?").toUpperCase();
}

/** S4 — Find a Room: browse-first finder (no typing, §7.3) + schematic map. */
export function MapScreen({
  rooms,
  buildings,
  onBack,
}: {
  rooms: Room[];
  buildings: Building[];
  onBack: () => void;
}) {
  const [tab, setTab] = useState<FinderTab>("rooms");
  const [buildingFilter, setBuildingFilter] = useState<string | "all">("all");
  const [letterFilter, setLetterFilter] = useState<string | "all">("all");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;
  const selectedBuilding = selectedRoom
    ? (buildings.find((b) => b.id === selectedRoom.building_id) ?? null)
    : null;

  const roomList = useMemo(() => {
    const filtered =
      buildingFilter === "all" ? rooms : rooms.filter((r) => r.building_id === buildingFilter);
    return [...filtered].sort((a, b) =>
      (a.label ?? a.id).localeCompare(b.label ?? b.id, undefined, { numeric: true }),
    );
  }, [rooms, buildingFilter]);

  const teacherList = useMemo(() => {
    const withTeacher = rooms.filter((r) => r.teacher_name);
    const unique = new Map<string, Room>();
    for (const room of withTeacher) {
      if (!unique.has(room.teacher_name!)) unique.set(room.teacher_name!, room);
    }
    const all = [...unique.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return letterFilter === "all" ? all : all.filter(([name]) => surnameInitial(name) === letterFilter);
  }, [rooms, letterFilter]);

  const teacherLetters = useMemo(() => {
    const letters = new Set(
      rooms.filter((r) => r.teacher_name).map((r) => surnameInitial(r.teacher_name!)),
    );
    return [...letters].sort();
  }, [rooms]);

  const chipClass = (active: boolean) =>
    `pressable h-14 rounded-full px-5 text-lg font-semibold ${
      active ? "bg-brahma-600 text-white" : "border border-[#dcd6cc] bg-white text-ink"
    }`;

  return (
    <div className="screen-enter flex h-screen flex-col bg-surface" data-testid="map-screen">
      <ScreenHeader title="Find a Room" onBack={onBack} />
      <div className="flex min-h-0 flex-1 gap-5 p-5 pb-6">
        {/* ── finder panel ─────────────────────────────────────── */}
        <aside className="flex w-[430px] shrink-0 flex-col rounded-3xl border border-[#e5e1da] bg-white">
          {/* tabs */}
          <div className="flex gap-2 p-4 pb-2">
            <button
              type="button"
              onClick={() => setTab("rooms")}
              className={`pressable h-16 flex-1 rounded-2xl text-xl font-bold ${
                tab === "rooms" ? "bg-brahma-600 text-white" : "bg-surface text-ink"
              }`}
              data-testid="tab-rooms"
            >
              By Room
            </button>
            <button
              type="button"
              onClick={() => setTab("teachers")}
              className={`pressable h-16 flex-1 rounded-2xl text-xl font-bold ${
                tab === "teachers" ? "bg-brahma-600 text-white" : "bg-surface text-ink"
              }`}
              data-testid="tab-teachers"
            >
              By Teacher
            </button>
          </div>

          {/* filter chips */}
          {tab === "rooms" ? (
            <div className="flex flex-wrap gap-2 px-4 py-3">
              <button type="button" className={chipClass(buildingFilter === "all")} onClick={() => setBuildingFilter("all")}>
                All
              </button>
              {buildings.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={chipClass(buildingFilter === b.id)}
                  onClick={() => setBuildingFilter(b.id)}
                  data-testid={`chip-${b.id}`}
                >
                  {shortLabel(b.id)}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 px-4 py-3">
              <button type="button" className={chipClass(letterFilter === "all")} onClick={() => setLetterFilter("all")}>
                All
              </button>
              {teacherLetters.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  className={chipClass(letterFilter === letter)}
                  onClick={() => setLetterFilter(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
          )}

          {/* result list */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4" style={{ overscrollBehavior: "contain" }}>
            {tab === "rooms"
              ? roomList.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedRoomId(room.id)}
                    data-testid={`room-row-${room.label ?? room.id}`}
                    className={`pressable mb-2 flex min-h-[72px] w-full items-center justify-between rounded-2xl px-5 text-left ${
                      room.id === selectedRoomId
                        ? "bg-brahma-600 text-white"
                        : "bg-surface text-ink"
                    }`}
                  >
                    <span className="text-2xl font-bold">{room.label ?? room.id}</span>
                    <span
                      className={`ml-4 truncate text-lg ${
                        room.id === selectedRoomId ? "text-gold-300" : "text-ink-muted"
                      }`}
                    >
                      {room.teacher_name ?? shortLabel(room.building_id)}
                    </span>
                  </button>
                ))
              : teacherList.map(([name, room]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`pressable mb-2 flex min-h-[72px] w-full items-center justify-between rounded-2xl px-5 text-left ${
                      room.id === selectedRoomId ? "bg-brahma-600 text-white" : "bg-surface text-ink"
                    }`}
                  >
                    <span className="truncate text-xl font-semibold">{name}</span>
                    <span
                      className={`ml-4 text-lg font-bold ${
                        room.id === selectedRoomId ? "text-gold-300" : "text-brahma-600"
                      }`}
                    >
                      Rm {room.label ?? "—"}
                    </span>
                  </button>
                ))}
          </div>
        </aside>

        {/* ── map + info card ──────────────────────────────────── */}
        <div className="relative min-w-0 flex-1">
          <CampusMap
            buildings={buildings}
            selectedBuildingId={selectedRoom?.building_id ?? null}
            onBuildingTap={(buildingId) => {
              setTab("rooms");
              setBuildingFilter(buildingId);
            }}
          />

          {selectedRoom && (
            <div
              className="absolute bottom-5 right-5 w-[420px] rounded-3xl border-2 border-gold-500 bg-white p-6 shadow-xl"
              data-testid="room-info-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-4xl font-extrabold text-brahma-600">
                    Room {selectedRoom.label ?? "—"}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-xl text-ink">
                    <MapPin className="h-6 w-6 text-gold-700" aria-hidden="true" />
                    {selectedBuilding?.label ?? selectedRoom.building_id}
                  </p>
                  {selectedRoom.teacher_name && (
                    <p className="mt-1 flex items-center gap-2 text-xl text-ink">
                      <GraduationCap className="h-6 w-6 text-gold-700" aria-hidden="true" />
                      {selectedRoom.teacher_name}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRoomId(null)}
                  className="pressable flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface text-ink"
                  aria-label="Clear selection"
                >
                  <X className="h-7 w-7" />
                </button>
              </div>
              <p className="mt-4 rounded-2xl bg-surface px-5 py-4 text-lg leading-snug text-ink">
                {ROUTE_HINTS[selectedRoom.building_id] ??
                  "Follow the gold route from the front office."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
