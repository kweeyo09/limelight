"use client";

import {
  CSSProperties,
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LoggedVisit, Show } from "@/lib/shows";

interface Stamp {
  x: number;
  y: number;
  rot: number;
  z: number;
}

const LOCAL_KEY = "limelight.visits";
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// ---- paper-cut curtain geometry (uneven, hand-cut) -------------------------
function pleatStyle(w: number, h: number, rot: number, rad: number, dir: number): CSSProperties {
  return {
    flexGrow: w,
    flexBasis: 0,
    height: h + "%",
    alignSelf: "flex-start",
    background: `linear-gradient(${dir}deg, oklch(0.57 0.17 28) 0%, oklch(0.48 0.185 28) 34%, oklch(0.36 0.15 27) 64%, oklch(0.5 0.18 28) 90%)`,
    borderBottomLeftRadius: rad + "px",
    borderBottomRightRadius: rad - 18 + "px",
    transform: `rotate(${rot}deg)`,
    transformOrigin: "50% 0%",
    boxShadow: "-5px 0 11px rgba(64,26,10,.16)",
    willChange: "transform",
  };
}

// [flexGrow, height%, rot, radius, gradientDir]
const LEFT: [number, number, number, number, number][] = [
  [1.15, 98, -1.2, 66, 102], [0.9, 90, 0.8, 82, 78], [1.25, 100, -0.6, 56, 104],
  [0.85, 93, 1.4, 90, 80], [1.1, 96, -1.0, 64, 100], [0.95, 87, 0.5, 76, 82],
];
const RIGHT: [number, number, number, number, number][] = [
  [0.95, 89, 1.0, 80, 80], [1.2, 96, -0.7, 58, 102], [0.88, 92, 1.3, 88, 78],
  [1.15, 100, -1.1, 62, 104], [0.92, 90, 0.6, 84, 80], [1.22, 97, -1.4, 56, 100],
];

// uneven scalloped valance swags
const SWAG_W = [1.1, 0.85, 1.25, 0.95, 1.15, 0.8, 1.2, 0.9, 1.1, 0.86, 1.18];
const SWAG_H = [54, 40, 60, 46, 56, 38, 58, 44, 52, 42, 56];

// Deterministic scatter so logged stubs land in a pleasing spread across the
// 680×500 stage rather than all on top of each other.
function scatterPos(i: number): Stamp {
  const cols = 3;
  const col = i % cols;
  const row = Math.floor(i / cols);
  const jitterX = ((i * 53) % 40) - 20;
  const jitterY = ((i * 31) % 36) - 18;
  const rot = (((i * 37) % 17) - 8) * 0.9;
  return {
    x: 30 + col * 225 + jitterX,
    y: 10 + row * 150 + jitterY,
    rot,
    z: i + 1,
  };
}

function mapsQuery(show: { theatre: string; address: string }): string {
  return encodeURIComponent(`${show.theatre}, ${show.address}`);
}

// "2024-10-12" → "12 OCT 2024" (falls back to whatever was typed).
function formatSeenDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return value.toUpperCase();
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${m[3]} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

function loadLocal(): LoggedVisit[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function saveLocal(visits: LoggedVisit[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(visits));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export default function TheatreLog({ shows }: { shows: Show[] }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Show[]>(shows);
  const [selected, setSelected] = useState<Show | null>(null);

  // logged visits (the ticket stubs)
  const [visits, setVisits] = useState<LoggedVisit[]>([]);
  const [dbConfigured, setDbConfigured] = useState<boolean | null>(null);
  const [stamps, setStamps] = useState<Record<string, Stamp>>({});

  // ---- load logged visits (DB → localStorage fallback) ----
  useEffect(() => {
    let alive = true;
    fetch("/api/logs")
      .then((r) => r.json())
      .then((d: { configured: boolean; visits: LoggedVisit[] }) => {
        if (!alive) return;
        if (d.configured) {
          setDbConfigured(true);
          setVisits(d.visits ?? []);
        } else {
          setDbConfigured(false);
          setVisits(loadLocal());
        }
      })
      .catch(() => {
        if (!alive) return;
        setDbConfigured(false);
        setVisits(loadLocal());
      });
    return () => {
      alive = false;
    };
  }, []);

  // give every visit a stage position (keep existing ones, scatter new ones)
  useEffect(() => {
    setStamps((prev) => {
      const next = { ...prev };
      visits.forEach((v, i) => {
        if (!next[v.id]) next[v.id] = scatterPos(i);
      });
      return next;
    });
  }, [visits]);

  // ---- curtain animation (cursor-reactive pleats) ----
  const pleatsRef = useRef<HTMLDivElement[]>([]);
  const centersRef = useRef<number[]>([]);
  const rotsRef = useRef<number[]>([]);
  const mx = useRef(0);
  const tx = useRef(0);
  const t0 = useRef(0);

  const setPleat = (i: number) => (el: HTMLDivElement | null) => {
    if (el) pleatsRef.current[i] = el;
  };

  const measure = useCallback(() => {
    centersRef.current = pleatsRef.current.map((el) => {
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2;
    });
  }, []);

  useEffect(() => {
    rotsRef.current = [...LEFT, ...RIGHT].map((p) => p[2]);
    mx.current = tx.current = window.innerWidth / 2;
    t0.current = performance.now();
    measure();

    const onMouse = (e: MouseEvent) => (tx.current = e.clientX);
    const onResize = () => measure();
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("resize", onResize);

    let raf = 0;
    const loop = (now: number) => {
      const t = now - t0.current;
      const W = window.innerWidth;
      mx.current += (tx.current - mx.current) * 0.09; // eased follow
      const m = mx.current;
      const pl = pleatsRef.current;
      for (let i = 0; i < pl.length; i++) {
        const el = pl[i];
        if (!el) continue;
        const cx = centersRef.current[i] ?? W / 2;
        const rot = rotsRef.current[i] ?? 0;
        const phase = i * 0.5;
        const idle = Math.sin(t * 0.0011 + phase) * 3;
        const d = m - cx;
        const infl = Math.exp(-(d * d) / (W * W * 0.13));
        const lean = d * 0.014 * infl;
        const sway = idle + lean;
        const breathe = 1 + 0.009 * Math.sin(t * 0.0011 + phase);
        el.style.transform = `rotate(${rot}deg) translateX(${sway.toFixed(2)}px) skewX(${(sway * 0.035).toFixed(3)}deg) scaleY(${breathe.toFixed(4)})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [measure]);

  // ---- Escape closes the detail panel, then the search overlay ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selected) setSelected(null);
      else if (searchOpen) setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, searchOpen]);

  // ---- ticket dragging ----
  const drag = useRef<{ id: string; sx: number; sy: number; x0: number; y0: number; moved: boolean } | null>(null);

  const onMove = useCallback((e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    d.moved = true;
    const nx = d.x0 + (e.clientX - d.sx);
    const ny = d.y0 + (e.clientY - d.sy);
    setStamps((s) => ({ ...s, [d.id]: { ...s[d.id], x: nx, y: ny } }));
  }, []);
  const onUp = useCallback(() => {
    drag.current = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  }, [onMove]);
  const onDown = (id: string) => (e: ReactPointerEvent) => {
    e.preventDefault();
    const st = stamps[id];
    if (!st) return;
    drag.current = { id, sx: e.clientX, sy: e.clientY, x0: st.x, y0: st.y, moved: false };
    setStamps((s) => {
      const mz = Math.max(0, ...Object.values(s).map((v) => v.z));
      return { ...s, [id]: { ...s[id], z: mz + 1 } };
    });
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // ---- search (talks to the /api/search backend) ----
  useEffect(() => {
    if (!searchOpen) return;
    const ctrl = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { results: Show[] }) => setResults(d.results))
        .catch(() => {});
    }, 120);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [query, searchOpen]);

  // ---- logging a visit ----
  const logVisit = useCallback(
    async (show: Show, theatre: string, dateValue: string, seat: string) => {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showId: show.id,
          theatre,
          date: formatSeenDate(dateValue),
          seat,
        }),
      });
      const data: { configured: boolean; visit?: LoggedVisit; error?: string } = await res.json();
      if (!res.ok || !data.visit) throw new Error(data.error ?? "Could not log visit");
      setVisits((v) => {
        const next = [...v, data.visit as LoggedVisit];
        if (!data.configured) saveLocal(next);
        return next;
      });
    },
    []
  );

  const removeVisit = useCallback(
    async (id: string) => {
      setVisits((v) => {
        const next = v.filter((x) => x.id !== id);
        if (dbConfigured === false) saveLocal(next);
        return next;
      });
      if (dbConfigured) {
        fetch(`/api/logs?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
      }
    },
    [dbConfigured]
  );

  return (
    <div className="stage">
      {/* ===== valance ===== */}
      <div className="valance">
        <div className="valance-bar">
          <div className="valance-title">Limelight</div>
        </div>
        <div className="swag-row">
          {SWAG_W.map((w, i) => (
            <div
              key={i}
              style={{
                flexGrow: w,
                flexBasis: 0,
                height: SWAG_H[i] + "px",
                background:
                  "linear-gradient(180deg, oklch(0.5 0.185 28) 0%, oklch(0.4 0.17 27) 100%)",
                borderBottomLeftRadius: "60% 100%",
                borderBottomRightRadius: "60% 100%",
                boxShadow: "0 4px 8px rgba(60,24,8,.18)",
              }}
            />
          ))}
        </div>
      </div>

      {/* ===== side curtains ===== */}
      <div className="curtain curtain-left">
        {LEFT.map((p, i) => (
          <div key={i} ref={setPleat(i)} style={pleatStyle(p[0], p[1], p[2], p[3], p[4])} />
        ))}
      </div>
      <div className="curtain curtain-right">
        {RIGHT.map((p, i) => (
          <div key={i} ref={setPleat(LEFT.length + i)} style={pleatStyle(p[0], p[1], p[2], p[3], p[4])} />
        ))}
      </div>
      <div className="curtain-seam" />

      {/* ===== spotlight ===== */}
      <div className="spotlight" />
      <div className="spotlight-vignette" />

      {/* ===== empty state (shown when no visits logged yet) ===== */}
      {visits.length === 0 && (
        <div className="stage-empty">
          <div className="stage-empty-eyebrow">The stage is set</div>
          <div className="stage-empty-title">No tickets stubbed yet</div>
          <p>
            Search the {shows.length} trending London shows, read a quick
            overview, and log the ones you&rsquo;ve seen — each becomes a
            draggable ticket stub here.
          </p>
          <button className="cta" onClick={() => setSearchOpen(true)}>
            Search the repertoire
          </button>
        </div>
      )}

      {/* ===== ticket stubs (logged visits) ===== */}
      <div className="tickets">
        {visits.map((t) => {
          const s = stamps[t.id];
          if (!s) return null;
          const st: CSSProperties = {
            position: "absolute",
            left: s.x + "px",
            top: s.y + "px",
            transform: `rotate(${s.rot}deg)`,
            zIndex: s.z,
            width: "210px",
            cursor: "grab",
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            filter:
              "drop-shadow(0 2px 3px rgba(50,36,20,.2)) drop-shadow(0 10px 20px rgba(50,36,20,.16))",
          };
          return (
            <div key={t.id} style={st} onPointerDown={onDown(t.id)}>
              <div className="ticket-paper">
                <button
                  className="ticket-remove"
                  aria-label="Remove this ticket"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => removeVisit(t.id)}
                >
                  ×
                </button>
                <div className="ticket-body">
                  <div className="ticket-head">
                    <span>ADMIT ONE</span>
                    <span style={{ color: t.accent, fontWeight: 600 }}>{t.serial}</span>
                  </div>
                  <div style={{ height: 2, background: t.accent, marginTop: 9 }} />
                  <div style={{ height: 1, background: "rgba(36,31,26,.16)", marginTop: 2 }} />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 58,
                      padding: "15px 2px 9px",
                    }}
                  >
                    <div className="ticket-title">{t.title}</div>
                  </div>
                  <div className="ticket-theatre">{t.theatre}</div>
                  <div className="ticket-city">{t.city}</div>
                  <div style={{ borderTop: "1px dashed rgba(36,31,26,.32)", margin: "14px -16px 0" }} />
                  <div className="ticket-meta">
                    <div>
                      <div className="meta-label">SEEN</div>
                      <div className="meta-value">{t.date}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="meta-label">SEAT</div>
                      <div className="meta-value">{t.seat || "—"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== search button ===== */}
      <button className="search-btn" aria-label="Search" onClick={() => setSearchOpen(true)}>
        <span className="ring" />
        <span className="handle" />
      </button>

      {/* ===== full-page search ===== */}
      {searchOpen && (
        <div className="search-overlay" onClick={() => setSearchOpen(false)}>
          <div className="search-eyebrow">Search the Repertoire · {shows.length} trending London shows</div>
          <input
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            placeholder="Title, theatre, genre…"
          />
          <div className="search-results" onClick={(e) => e.stopPropagation()}>
            {results.length === 0 ? (
              <div className="search-empty">No matches in the repertoire.</div>
            ) : (
              results.map((r) => (
                <button
                  className="search-result"
                  key={r.id}
                  onClick={() => setSelected(r)}
                >
                  <span className="sr-title">{r.title}</span>
                  <span className="sr-sub">
                    {r.genre} · {r.theatre}
                  </span>
                  <span className="sr-go" style={{ color: r.accent }}>
                    View ›
                  </span>
                </button>
              ))
            )}
          </div>
          <div className="search-hint">Click a show for its overview · Esc to close</div>
        </div>
      )}

      {/* ===== show detail + log panel ===== */}
      {selected && (
        <ShowDetail
          show={selected}
          dbConfigured={dbConfigured}
          alreadyLogged={visits.filter((v) => v.showId === selected.id)}
          onClose={() => setSelected(null)}
          onLog={logVisit}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail panel: brief overview + real theatre location (Google Map) + the
// "log when you've seen it, and at which theatre" form.
// ---------------------------------------------------------------------------
function ShowDetail({
  show,
  dbConfigured,
  alreadyLogged,
  onClose,
  onLog,
}: {
  show: Show;
  dbConfigured: boolean | null;
  alreadyLogged: LoggedVisit[];
  onClose: () => void;
  onLog: (show: Show, theatre: string, date: string, seat: string) => Promise<void>;
}) {
  const [theatre, setTheatre] = useState(show.theatre);
  const [date, setDate] = useState("");
  const [seat, setSeat] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapSrc = useMemo(
    () =>
      MAPS_KEY
        ? `https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${mapsQuery(show)}&zoom=16`
        : null,
    [show]
  );
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${mapsQuery(show)}`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError("Pick the date you saw it.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onLog(show, theatre.trim() || show.theatre, date, seat.trim());
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div
        className="detail-card"
        onClick={(e) => e.stopPropagation()}
        style={{ "--accent": show.accent } as CSSProperties}
      >
        <button className="detail-close" aria-label="Close" onClick={onClose}>
          ×
        </button>

        <div className="detail-genre">{show.genre}</div>
        <h2 className="detail-title">{show.title}</h2>
        <p className="detail-overview">{show.overview}</p>

        <div className="detail-venue">
          <div className="detail-venue-name">{show.theatre}</div>
          <div className="detail-venue-addr">{show.address}</div>
        </div>

        {/* real theatre location via Google Maps */}
        <div className="detail-map">
          {mapSrc ? (
            <iframe
              title={`Map of ${show.theatre}`}
              src={mapSrc}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          ) : (
            <a className="detail-map-fallback" href={mapLink} target="_blank" rel="noreferrer">
              <span className="pin">◎</span>
              View {show.theatre} on Google Maps
              <small>
                (add a NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to embed the live map here)
              </small>
            </a>
          )}
        </div>

        {/* log this show */}
        {done ? (
          <div className="detail-logged">
            <div className="detail-logged-tick" style={{ color: show.accent }}>
              ✓
            </div>
            <div>
              Logged — <strong>{show.title}</strong> at {theatre || show.theatre}. A
              ticket stub is now on your stage.
            </div>
            <button className="cta" onClick={onClose}>
              Back to the stage
            </button>
          </div>
        ) : (
          <form className="log-form" onSubmit={submit}>
            <div className="log-form-eyebrow">Log a visit — record when you saw it</div>
            <div className="log-row">
              <label>
                <span>Date seen</span>
                <input
                  type="date"
                  value={date}
                  max="2099-12-31"
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </label>
              <label>
                <span>Seat (optional)</span>
                <input
                  type="text"
                  value={seat}
                  placeholder="e.g. STALLS H14"
                  onChange={(e) => setSeat(e.target.value)}
                />
              </label>
            </div>
            <label className="log-theatre">
              <span>Theatre seen at</span>
              <input
                type="text"
                value={theatre}
                onChange={(e) => setTheatre(e.target.value)}
                placeholder={show.theatre}
              />
            </label>
            {error && <div className="log-error">{error}</div>}
            <button className="cta" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Log this show"}
            </button>
            <div className="log-store-note">
              {dbConfigured === true
                ? "Saved to your database."
                : dbConfigured === false
                ? "Saved in this browser (add a database to sync across devices)."
                : ""}
            </div>
          </form>
        )}

        {alreadyLogged.length > 0 && (
          <div className="detail-history">
            Previously logged:{" "}
            {alreadyLogged.map((v) => `${v.date} (${v.theatre})`).join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}
