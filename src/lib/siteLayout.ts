// Site layout for the Groups map: where each group (station) sits on a bird's-eye
// floor plan. Prototype only — kept in localStorage until the camera survey exists.
// Coordinates are in plan units on a fixed PLAN_W x PLAN_H plan; the map scales it.

export const PLAN_W = 872;
export const PLAN_H = 480;

export interface SiteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SiteLayout {
  placements: Record<string, SiteRect>; // keyed by group id
  generatedAt: string | null;           // set when the layout came from a survey
}

const STORAGE_KEY = 'groupsSiteLayout';

// Station slots on a 6 x 4 grid, ordered walls first (serving line along the top,
// then the side walls, then the front) so a few groups read like a real room.
const COLS = 6;
const ROWS = 4;
const CELL_W = 124;
const CELL_H = 88;
const GAP_X = 16;
const GAP_Y = 24;
const MARGIN = 24;

function slot(col: number, row: number): SiteRect {
  return { x: MARGIN + col * (CELL_W + GAP_X), y: MARGIN + row * (CELL_H + GAP_Y), w: CELL_W, h: CELL_H };
}

const SLOTS: SiteRect[] = (() => {
  const order: [number, number][] = [];
  for (let c = 0; c < COLS; c++) order.push([c, 0]);
  for (let r = 1; r < ROWS; r++) order.push([0, r]);
  for (let r = 1; r < ROWS; r++) order.push([COLS - 1, r]);
  for (let c = 1; c < COLS - 1; c++) order.push([c, ROWS - 1]);
  for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) order.push([c, r]);
  return order.map(([c, r]) => slot(c, r));
})();

// Open floor in the middle of the room, drawn behind the stations.
export const SEATING_AREA: SiteRect = {
  x: MARGIN + CELL_W + GAP_X,
  y: MARGIN + CELL_H + GAP_Y,
  w: (COLS - 2) * CELL_W + (COLS - 3) * GAP_X,
  h: (ROWS - 2) * CELL_H + (ROWS - 3) * GAP_Y,
};

function overlaps(a: SiteRect, b: SiteRect) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

// Gives every group without a spot the next free slot. Existing spots are kept.
export function placeGroups(layout: SiteLayout, groupIds: string[]): SiteLayout {
  const placements = { ...layout.placements };
  for (const id of groupIds) {
    if (placements[id]) continue;
    const taken = Object.values(placements);
    const free = SLOTS.find(s => !taken.some(t => overlaps(s, t)));
    // More groups than slots: stack them in the last slot rather than drop them
    placements[id] = free ?? SLOTS[SLOTS.length - 1];
  }
  return { ...layout, placements };
}

export function loadSiteLayout(): SiteLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SiteLayout;
  } catch {
    // Storage unavailable or corrupt: start fresh
  }
  return { placements: {}, generatedAt: null };
}

export function saveSiteLayout(layout: SiteLayout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Storage unavailable: layout lasts for this session only
  }
}
