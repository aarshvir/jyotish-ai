/**
 * Pure-math geometry for North-Indian and South-Indian rasi chart layouts.
 * No React dependency — fully unit-testable in Node.
 *
 * Coordinate system: normalised (0,0) top-left → (1,1) bottom-right.
 * Multiply by pixel size at render time.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export interface HouseRegion {
  /** SVG polygon points string, normalised 0-1 */
  points: string;
  /** Centroid of the region — use as planet label anchor */
  labelAnchor: Point;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function pts(...ps: Point[]): string {
  return ps.map((p) => `${p.x},${p.y}`).join(' ');
}

function centroid(...ps: Point[]): Point {
  return {
    x: ps.reduce((s, p) => s + p.x, 0) / ps.length,
    y: ps.reduce((s, p) => s + p.y, 0) / ps.length,
  };
}

// ─── North-Indian layout ─────────────────────────────────────────────────────
/**
 * North-Indian Kundali chart uses a 3×3 grid of cells.
 * The 4 corner cells are each split diagonally into 2 triangles, giving 12 regions.
 * The center cell (row=1, col=1) is empty (shows native info).
 *
 * Layout (H1=Lagna at top-center, clockwise):
 *
 *   ┌──────┬────────┬──────┐
 *   │H12/  │  H1    │  \H2 │
 *   │  /H11│ (top)  │H3\   │
 *   ├──────┼────────┼──────┤
 *   │ H10  │        │  H4  │
 *   ├──────┼────────┼──────┤
 *   │H9\   │  H7    │  /H5 │
 *   │   \H8│(bottom)│H6/   │
 *   └──────┴────────┴──────┘
 *
 * Corner cells:
 *   Top-left    → H11 (upper-left triangle) + H12 (lower-right triangle)
 *   Top-right   → H2  (upper-right triangle) + H3  (lower-left triangle)
 *   Bottom-right→ H5  (upper-right triangle) + H6  (lower-left triangle)
 *   Bottom-left → H8  (lower-right triangle) + H9  (upper-left triangle)
 */
export function getNorthIndianHouseRegion(houseNum: number): HouseRegion {
  const a = 1 / 3; // first third
  const b = 2 / 3; // second third

  // Shorthand grid points (all 16 intersections of the 3×3 grid, but we only use the
  // 12 that border house cells).
  const p = (x: number, y: number): Point => ({ x, y });

  // Cell boundaries: named as r<row>c<col>
  const cells: Record<number, Point[]> = {
    // Side cells (rectangles)
    1:  [p(a,0), p(b,0), p(b,a), p(a,a)],  // top-center
    4:  [p(b,a), p(1,a), p(1,b), p(b,b)],  // right-center
    7:  [p(a,b), p(b,b), p(b,1), p(a,1)],  // bottom-center
    10: [p(0,a), p(a,a), p(a,b), p(0,b)],  // left-center

    // Corner cells split diagonally (top-left quadrant)
    // Diagonal goes from (0,0) to (a,a)
    12: [p(0,0), p(a,0), p(a,a)],           // top-left corner, upper triangle → H12
    11: [p(0,0), p(a,a), p(0,a)],           // top-left corner, lower triangle → H11

    // Top-right corner (diagonal from (b,0) to (1,a))
    2:  [p(b,0), p(1,0), p(1,a)],           // top-right corner, right triangle → H2
    3:  [p(b,0), p(1,a), p(b,a)],           // top-right corner, left triangle  → H3

    // Bottom-right corner (diagonal from (b,b) to (1,1))
    5:  [p(b,b), p(1,b), p(1,1)],           // bottom-right corner, upper triangle → H5
    6:  [p(b,b), p(1,1), p(b,1)],           // bottom-right corner, lower triangle → H6

    // Bottom-left corner (diagonal from (0,b) to (a,1))
    8:  [p(0,b), p(a,b), p(a,1)],           // bottom-left corner, right triangle → H8
    9:  [p(0,b), p(a,1), p(0,1)],           // bottom-left corner, left triangle  → H9
  };

  const poly = cells[houseNum] ?? cells[1];
  return {
    points: pts(...poly),
    labelAnchor: centroid(...poly),
  };
}

// ─── South-Indian layout ─────────────────────────────────────────────────────
/**
 * South-Indian chart uses a fixed 4×4 grid.
 * Signs are FIXED (Aries always top-second-from-left).
 * Houses are computed relative to the Lagna sign.
 *
 * Layout (by sign):
 *   ┌──────┬──────┬──────┬──────┐
 *   │  Pi  │  Ar  │  Ta  │  Ge  │  row 0
 *   ├──────┼──────┼──────┼──────┤
 *   │  Aq  │      │      │  Ca  │  row 1
 *   ├──────┼──────┼──────┼──────┤
 *   │  Cp  │      │      │  Le  │  row 2
 *   ├──────┼──────┼──────┼──────┤
 *   │  Sa  │  Sc  │  Li  │  Vi  │  row 3
 *   └──────┴──────┴──────┴──────┘
 */

/** Sign number (1=Aries…12=Pisces) → grid position in South-Indian chart */
export const SOUTH_SIGN_GRID: Record<number, { row: number; col: number }> = {
  12: { row: 0, col: 0 }, // Pisces
  1:  { row: 0, col: 1 }, // Aries
  2:  { row: 0, col: 2 }, // Taurus
  3:  { row: 0, col: 3 }, // Gemini
  11: { row: 1, col: 0 }, // Aquarius
  4:  { row: 1, col: 3 }, // Cancer
  10: { row: 2, col: 0 }, // Capricorn
  5:  { row: 2, col: 3 }, // Leo
  9:  { row: 3, col: 0 }, // Sagittarius
  8:  { row: 3, col: 1 }, // Scorpio
  7:  { row: 3, col: 2 }, // Libra
  6:  { row: 3, col: 3 }, // Virgo
};

/** Returns geometry for a South-Indian cell by sign number (1=Aries…12=Pisces). */
export function getSouthIndianSignRegion(signNum: number): HouseRegion {
  const pos = SOUTH_SIGN_GRID[signNum] ?? { row: 0, col: 1 };
  const w = 0.25;
  const x0 = pos.col * w;
  const y0 = pos.row * w;
  const x1 = x0 + w;
  const y1 = y0 + w;
  return {
    points: `${x0},${y0} ${x1},${y0} ${x1},${y1} ${x0},${y1}`,
    labelAnchor: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 },
  };
}

// ─── Sign/house utilities ────────────────────────────────────────────────────

/** Zodiac sign name → sign number (1=Aries). Case-insensitive. */
export const SIGN_NAME_TO_NUM: Record<string, number> = {
  aries: 1, taurus: 2, gemini: 3, cancer: 4, leo: 5, virgo: 6,
  libra: 7, scorpio: 8, sagittarius: 9, capricorn: 10, aquarius: 11, pisces: 12,
};

export function signNameToNum(name: string): number {
  return SIGN_NAME_TO_NUM[name.toLowerCase()] ?? 1;
}

/** Sign number → sign name. */
export const SIGN_NUM_TO_NAME: Record<number, string> = {
  1: 'Aries', 2: 'Taurus', 3: 'Gemini', 4: 'Cancer', 5: 'Leo', 6: 'Virgo',
  7: 'Libra', 8: 'Scorpio', 9: 'Sagittarius', 10: 'Capricorn', 11: 'Aquarius', 12: 'Pisces',
};

/**
 * Given a planet's sign number and the lagna sign number, return the house number (1-12).
 * House 1 = lagna sign, counting forward through zodiac.
 */
export function signNumToHouseNum(signNum: number, lagnaSignNum: number): number {
  return ((signNum - lagnaSignNum + 12) % 12) + 1;
}

/**
 * Given a house number (1-12) and the lagna sign number, return the sign number.
 */
export function houseNumToSignNum(houseNum: number, lagnaSignNum: number): number {
  return ((lagnaSignNum + houseNum - 2) % 12) + 1;
}

// ─── Planet stacking ─────────────────────────────────────────────────────────

/**
 * Compute a display anchor for a planet in a house, accounting for multiple planets.
 * Returns a normalised (0-1) point offset from the region's label anchor.
 */
export function getPlanetStackOffset(
  anchor: Point,
  total: number,
  index: number,
  stepSize = 0.04,
): Point {
  if (total <= 1) return anchor;
  const cols = Math.min(total, 3);
  const row = Math.floor(index / cols);
  const col = index % cols;
  const rowTotal = Math.min(total - row * cols, cols);
  const offsetX = (col - (rowTotal - 1) / 2) * stepSize;
  const offsetY = row * stepSize * 1.4;
  return { x: anchor.x + offsetX, y: anchor.y + offsetY };
}

/**
 * Get the final normalised anchor for a planet in the chart.
 *
 * @param houseNum      1-12 (planet's house relative to lagna)
 * @param totalInHouse  Total planets in this house
 * @param indexInHouse  0-based index of this planet within the house
 * @param chartType     'north' | 'south'
 * @param lagnaSignNum  Sign number of lagna (required for south chart)
 */
export function getPlanetAnchor(
  houseNum: number,
  totalInHouse: number,
  indexInHouse: number,
  chartType: 'north' | 'south',
  lagnaSignNum = 1,
): Point {
  let region: HouseRegion;

  if (chartType === 'south') {
    const signNum = houseNumToSignNum(houseNum, lagnaSignNum);
    region = getSouthIndianSignRegion(signNum);
  } else {
    region = getNorthIndianHouseRegion(houseNum);
  }

  return getPlanetStackOffset(region.labelAnchor, totalInHouse, indexInHouse);
}
