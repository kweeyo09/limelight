import { NextResponse } from "next/server";
import { SHOWS } from "@/lib/shows";

// GET /api/shows  →  the full repertoire
export async function GET() {
  return NextResponse.json({ shows: SHOWS, count: SHOWS.length });
}
