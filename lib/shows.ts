// ---------------------------------------------------------------------------
// Data layer for Limelight. This is the single source of truth the API routes
// (app/api/*) and the server-rendered page read from. Swap this for a database
// or CMS later without touching the UI.
// ---------------------------------------------------------------------------

export interface Show {
  id: string;
  title: string;
  theatre: string;
  city: string;
  date: string; // human display, e.g. "12 OCT 2024"
  seat: string;
  serial: string;
  accent: string; // oklch() accent for the stub
  /** default scatter position on the desk (px, relative to the 680×500 stage) */
  pos: { x: number; y: number; rot: number; z: number };
}

export const SHOWS: Show[] = [
  {
    id: "lk",
    title: "The Lion King",
    theatre: "Lyceum Theatre",
    city: "London",
    date: "12 OCT 2024",
    seat: "STALLS H14",
    serial: "№ 0142",
    accent: "oklch(0.62 0.085 70)",
    pos: { x: 40, y: 22, rot: -6, z: 2 },
  },
  {
    id: "phantom",
    title: "The Phantom of the Opera",
    theatre: "His Majesty's",
    city: "London",
    date: "03 FEB 2023",
    seat: "ROYAL CIRCLE C9",
    serial: "№ 0088",
    accent: "oklch(0.58 0.088 28)",
    pos: { x: 250, y: 0, rot: 5, z: 4 },
  },
  {
    id: "wicked",
    title: "Wicked",
    theatre: "Apollo Victoria",
    city: "London",
    date: "21 JUN 2024",
    seat: "STALLS M22",
    serial: "№ 0119",
    accent: "oklch(0.6 0.082 152)",
    pos: { x: 455, y: 46, rot: 8, z: 1 },
  },
  {
    id: "lesmis",
    title: "Les Misérables",
    theatre: "Sondheim Theatre",
    city: "London",
    date: "08 NOV 2022",
    seat: "DRESS CIRCLE B4",
    serial: "№ 0061",
    accent: "oklch(0.58 0.085 250)",
    pos: { x: 105, y: 236, rot: -8, z: 3 },
  },
  {
    id: "mamma",
    title: "Mamma Mia!",
    theatre: "Novello Theatre",
    city: "London",
    date: "30 MAR 2025",
    seat: "STALLS K17",
    serial: "№ 0173",
    accent: "oklch(0.58 0.088 332)",
    pos: { x: 345, y: 252, rot: 6, z: 5 },
  },
];

/** Case-insensitive search across title, theatre, city, and date. */
export function searchShows(query: string): Show[] {
  const q = query.trim().toLowerCase();
  if (!q) return SHOWS;
  return SHOWS.filter((s) =>
    [s.title, s.theatre, s.city, s.date, s.seat]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}
