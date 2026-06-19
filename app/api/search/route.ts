import { NextRequest, NextResponse } from "next/server";
import { searchShows } from "@/lib/shows";

// GET /api/search?q=phantom  →  matching shows
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = searchShows(q);
  return NextResponse.json({ query: q, results, count: results.length });
}
