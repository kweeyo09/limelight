import { SHOWS } from "@/lib/shows";
import TheatreLog from "@/components/TheatreLog";

// Server component: reads the repertoire from the data layer and hands it to
// the interactive client UI. The live /api/shows and /api/search routes read
// from the same source.
export default function Home() {
  return <TheatreLog shows={SHOWS} />;
}
