/** Schematic campus geometry for the kiosk map.
 *
 * Building ids match the `buildings` table in the dbhs-wayfinder Supabase
 * project so DB-driven room data lights up these shapes directly. The shapes
 * are a placeholder schematic — swap for the real interactivemap SVG when it
 * is merged (PLANNING §7, Q2). Routes are hand-authored fixed-origin
 * polylines from the front office (Decision D15).
 */

export const VIEWBOX = { width: 1200, height: 800 };

export interface BuildingShape {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Short label drawn on the shape, e.g. "200s" */
  short: string;
}

export const BUILDING_SHAPES: BuildingShape[] = [
  { id: "bldg-200", x: 330, y: 595, w: 170, h: 125, short: "200s" },
  { id: "bldg-300", x: 540, y: 595, w: 170, h: 125, short: "300s" },
  { id: "bldg-900", x: 750, y: 595, w: 210, h: 125, short: "900s" },
  { id: "bldg-400", x: 330, y: 415, w: 170, h: 120, short: "400s" },
  { id: "bldg-500", x: 540, y: 415, w: 170, h: 120, short: "500s" },
  { id: "bldg-600", x: 750, y: 415, w: 170, h: 120, short: "600s" },
  { id: "bldg-1100", x: 990, y: 415, w: 150, h: 305, short: "1100s" },
];

/** Non-findable landmarks that make the schematic readable. */
export const LANDMARKS = [
  { id: "gym", x: 70, y: 180, w: 260, h: 170, label: "Gym" },
  { id: "library", x: 400, y: 200, w: 220, h: 140, label: "Library" },
  { id: "cafeteria", x: 680, y: 200, w: 200, h: 140, label: "Cafeteria" },
];

export const FRONT_OFFICE = { x: 70, y: 610, w: 210, h: 110, label: "Front Office" };

/** Kiosk location — the fixed route origin. */
export const YOU_ARE_HERE = { x: 175, y: 655 };

/** Fixed-origin walking routes: front office door → building entrance,
 *  riding the main east–west walkway at y=560. */
export const ROUTES: Record<string, string> = {
  "bldg-200": "175,610 175,560 415,560 415,595",
  "bldg-300": "175,610 175,560 625,560 625,595",
  "bldg-900": "175,610 175,560 855,560 855,595",
  "bldg-400": "175,610 175,560 415,560 415,535",
  "bldg-500": "175,610 175,560 625,560 625,535",
  "bldg-600": "175,610 175,560 835,560 835,535",
  "bldg-1100": "175,610 175,560 985,560 985,565",
};

/** One-line walking hints shown on the room info card. */
export const ROUTE_HINTS: Record<string, string> = {
  "bldg-200": "Exit the office and follow the main walkway — the 200s are the first building on your right.",
  "bldg-300": "Follow the main walkway past the 200s — the 300s are the second building on your right.",
  "bldg-900": "Follow the main walkway toward the far end — the 900s (Theater & Arts) are on your right.",
  "bldg-400": "Follow the main walkway and turn left at the first building — the 400s face the walkway.",
  "bldg-500": "Follow the main walkway and turn left at the second building — the 500s face the walkway.",
  "bldg-600": "Follow the main walkway most of the way down, then turn left into the 600s.",
  "bldg-1100": "Follow the main walkway all the way to the end — the 1100s are the tall building ahead.",
};
