import { useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { Building } from "../lib/types";
import {
  BUILDING_SHAPES,
  FRONT_OFFICE,
  LANDMARKS,
  ROUTES,
  VIEWBOX,
  YOU_ARE_HERE,
} from "./campus";

const MIN_SCALE = 1;
const MAX_SCALE = 2.5;

/** Interactive schematic campus map: tap a building, see the highlighted
 * fixed-origin route. Pan by drag; zoom via on-screen buttons only — browser
 * pinch-zoom stays disabled globally (§6.7 / §7.3). */
export function CampusMap({
  buildings,
  selectedBuildingId,
  onBuildingTap,
}: {
  buildings: Building[];
  selectedBuildingId: string | null;
  onBuildingTap: (buildingId: string) => void;
}) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ pointerId: number; startX: number; startY: number; panX: number; panY: number } | null>(null);
  const buildingLabel = (id: string) => buildings.find((b) => b.id === id)?.label;

  const clampPan = (value: number, s: number) => {
    const limit = 320 * (s - 1) + 40;
    return Math.max(-limit, Math.min(limit, value));
  };

  const zoomTo = (s: number) => {
    const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
    setScale(next);
    setPan((p) => ({ x: clampPan(p.x, next), y: clampPan(p.y, next) }));
  };

  const route = selectedBuildingId ? ROUTES[selectedBuildingId] : undefined;
  const routeEnd = route
    ?.split(" ")
    .at(-1)
    ?.split(",")
    .map(Number) as [number, number] | undefined;

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-3xl border border-[#e5e1da] bg-white"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        drag.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          panX: pan.x,
          panY: pan.y,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current || drag.current.pointerId !== e.pointerId) return;
        setPan({
          x: clampPan(drag.current.panX + (e.clientX - drag.current.startX), scale),
          y: clampPan(drag.current.panY + (e.clientY - drag.current.startY), scale),
        });
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      data-testid="campus-map"
    >
      <div
        className="h-full w-full"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: drag.current ? "none" : "transform 150ms ease-out",
        }}
      >
        <svg viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} className="h-full w-full">
          {/* grounds */}
          <rect x="20" y="120" width="1160" height="640" rx="24" fill="#eef0e9" />

          {/* walkways */}
          <line x1="120" y1="560" x2="1120" y2="560" stroke="#d8d4cb" strokeWidth="26" strokeLinecap="round" />
          <line x1="175" y1="610" x2="175" y2="560" stroke="#d8d4cb" strokeWidth="22" strokeLinecap="round" />
          <line x1="200" y1="380" x2="1000" y2="380" stroke="#d8d4cb" strokeWidth="18" strokeLinecap="round" />
          <line x1="415" y1="560" x2="415" y2="380" stroke="#d8d4cb" strokeWidth="14" />
          <line x1="625" y1="560" x2="625" y2="380" stroke="#d8d4cb" strokeWidth="14" />
          <line x1="835" y1="560" x2="835" y2="380" stroke="#d8d4cb" strokeWidth="14" />

          {/* landmarks (not findable) */}
          {LANDMARKS.map((l) => (
            <g key={l.id}>
              <rect x={l.x} y={l.y} width={l.w} height={l.h} rx="14" fill="#dfd9ee" stroke="#b9aed6" strokeWidth="2" />
              <text
                x={l.x + l.w / 2}
                y={l.y + l.h / 2 + 8}
                textAnchor="middle"
                className="fill-brahma-600"
                fontSize="24"
                fontWeight="600"
              >
                {l.label}
              </text>
            </g>
          ))}

          {/* front office + you-are-here */}
          <rect
            x={FRONT_OFFICE.x}
            y={FRONT_OFFICE.y}
            width={FRONT_OFFICE.w}
            height={FRONT_OFFICE.h}
            rx="14"
            fill="var(--color-brahma-600)"
          />
          <text
            x={FRONT_OFFICE.x + FRONT_OFFICE.w / 2}
            y={FRONT_OFFICE.y + 48}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="22"
            fontWeight="700"
          >
            Front Office
          </text>
          <text
            x={FRONT_OFFICE.x + FRONT_OFFICE.w / 2}
            y={FRONT_OFFICE.y + 78}
            textAnchor="middle"
            className="fill-gold-300"
            fontSize="16"
            fontWeight="600"
            letterSpacing="2"
          >
            YOU ARE HERE
          </text>
          <circle
            cx={YOU_ARE_HERE.x}
            cy={YOU_ARE_HERE.y - 62}
            r="9"
            className="fill-gold-500"
            style={{ animation: "you-are-here 1.8s ease-in-out infinite" }}
          />

          {/* findable buildings */}
          {BUILDING_SHAPES.map((b) => {
            const selected = b.id === selectedBuildingId;
            return (
              <g
                key={b.id}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onBuildingTap(b.id)}
                style={{ cursor: "pointer" }}
                data-testid={`map-${b.id}`}
              >
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  rx="14"
                  fill={selected ? "var(--color-gold-300)" : "#ded7ef"}
                  stroke={selected ? "var(--color-gold-700)" : "var(--color-brahma-400)"}
                  strokeWidth={selected ? 5 : 2.5}
                />
                <text
                  x={b.x + b.w / 2}
                  y={b.y + b.h / 2 - 2}
                  textAnchor="middle"
                  className="fill-brahma-700"
                  fontSize="30"
                  fontWeight="800"
                >
                  {b.short}
                </text>
                <text
                  x={b.x + b.w / 2}
                  y={b.y + b.h / 2 + 30}
                  textAnchor="middle"
                  className="fill-brahma-600"
                  fontSize="15"
                  fontWeight="500"
                >
                  {buildingLabel(b.id) ?? ""}
                </text>
              </g>
            );
          })}

          {/* highlighted route (re-mounts per building so the draw animation restarts) */}
          {route && (
            <g key={selectedBuildingId}>
              <polyline
                points={route}
                pathLength={1}
                className="route-path"
                fill="none"
                stroke="var(--color-gold-500)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {routeEnd && (
                <circle cx={routeEnd[0]} cy={routeEnd[1]} r="11" fill="var(--color-gold-500)" stroke="#ffffff" strokeWidth="3" />
              )}
            </g>
          )}
        </svg>
      </div>

      {/* zoom controls */}
      <div className="absolute right-5 top-5 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => zoomTo(scale + 0.35)}
          className="pressable flex h-16 w-16 items-center justify-center rounded-2xl border border-[#e5e1da] bg-white text-brahma-600 shadow"
          aria-label="Zoom in"
        >
          <Plus className="h-8 w-8" />
        </button>
        <button
          type="button"
          onClick={() => zoomTo(scale - 0.35)}
          className="pressable flex h-16 w-16 items-center justify-center rounded-2xl border border-[#e5e1da] bg-white text-brahma-600 shadow"
          aria-label="Zoom out"
        >
          <Minus className="h-8 w-8" />
        </button>
        <button
          type="button"
          onClick={() => {
            setScale(1);
            setPan({ x: 0, y: 0 });
          }}
          className="pressable flex h-16 w-16 items-center justify-center rounded-2xl border border-[#e5e1da] bg-white text-brahma-600 shadow"
          aria-label="Reset view"
        >
          <RotateCcw className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}
