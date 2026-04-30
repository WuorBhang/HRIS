import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import Layout from "../../components/Layout";
import { subscribeHolidays } from "../../lib/holidayService";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function AdminPublicHolidays() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  // Default the calendar to *today's* month/year so it always opens on
  // whatever year is current — no manual roll-over needed each January.
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    const unsub = subscribeHolidays((list) => {
      setHolidays(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Map: "YYYY-MM-DD" -> holiday object, for O(1) lookup while rendering days.
  const byDate = useMemo(() => {
    const m = {};
    for (const h of holidays) m[h.date] = h;
    return m;
  }, [holidays]);

  const yearsAvailable = useMemo(() => {
    const ys = new Set(holidays.map((h) => Number(h.date.slice(0, 4))));
    ys.add(today.getFullYear());
    return Array.from(ys).sort((a, b) => a - b);
  }, [holidays, today]);

  // Build the visible 6-week calendar grid, Monday-first.
  const calendarDays = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    // JS getDay(): 0=Sun..6=Sat. Convert to Mon-first (0=Mon..6=Sun).
    const startOffset = (first.getDay() + 6) % 7;
    const start = new Date(viewYear, viewMonth, 1 - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [viewYear, viewMonth]);

  const yearHolidays = useMemo(() => {
    return holidays
      .filter((h) => h.date.startsWith(String(viewYear)))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays, viewYear]);

  const nextHoliday = useMemo(() => {
    const todayStr = today.toISOString().slice(0, 10);
    return holidays
      .filter((h) => h.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
  }, [holidays, today]);

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };
  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const fmtDate = (d) =>
    d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">
            Public Holidays
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kenya public holiday calendar used across the platform.
          </p>
        </div>
        {nextHoliday && (
          <div className="bg-accent/10 border border-accent/30 text-primary rounded-md px-4 py-2 text-sm">
            <div className="text-xs uppercase tracking-wide text-accent font-semibold">
              Next holiday
            </div>
            <div className="font-medium">
              {nextHoliday.name} —{" "}
              {new Date(nextHoliday.date + "T00:00:00").toLocaleDateString(
                "en-GB",
                { day: "2-digit", month: "long", year: "numeric" },
              )}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-card rounded-lg shadow p-12 text-center text-sm text-muted-foreground">
          Loading holiday calendar…
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Calendar */}
          <section className="lg:col-span-2 bg-card rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 gap-2">
              <button
                onClick={goPrev}
                className="p-2 rounded-md hover:bg-muted/40 text-muted-foreground"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-primary">
                  {MONTH_NAMES[viewMonth]}
                </h2>
                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  className="text-sm border border-border rounded-md px-2 py-1 bg-card outline-none focus:ring-2 focus:ring-primary"
                >
                  {yearsAvailable.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <button
                  onClick={goToday}
                  className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                >
                  Today
                </button>
              </div>
              <button
                onClick={goNext}
                className="p-2 rounded-md hover:bg-muted/40 text-muted-foreground"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-xs font-medium text-muted-foreground mb-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-center py-1">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((d, i) => {
                const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                const inMonth = d.getMonth() === viewMonth;
                const isToday = d.getTime() === today.getTime();
                const holiday = byDate[iso];
                return (
                  <div
                    key={i}
                    className={`min-h-[64px] sm:min-h-[80px] rounded-md border p-1.5 text-xs flex flex-col ${
                      !inMonth
                        ? "bg-muted/20 border-transparent text-muted-foreground/50"
                        : holiday
                          ? "bg-accent/10 border-accent/40"
                          : "border-border"
                    }`}
                    title={holiday ? holiday.name : undefined}
                  >
                    <div
                      className={`flex items-center justify-between mb-1 ${
                        isToday ? "font-bold text-primary" : ""
                      }`}
                    >
                      <span
                        className={`${
                          isToday
                            ? "bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                            : ""
                        }`}
                      >
                        {d.getDate()}
                      </span>
                    </div>
                    {holiday && inMonth && (
                      <div className="text-[10px] sm:text-[11px] text-accent font-semibold leading-tight line-clamp-2">
                        {holiday.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-accent/30 border border-accent/40" />
                Public holiday
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-primary text-primary-foreground" />
                Today
              </div>
            </div>
          </section>

          {/* Year list */}
          <aside className="bg-card rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-primary" />
              <h2 className="text-base sm:text-lg font-semibold text-primary">
                {viewYear} holidays
              </h2>
            </div>
            {yearHolidays.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No holidays recorded for {viewYear}.
              </p>
            ) : (
              <ul className="divide-y divide-border max-h-[480px] overflow-y-auto">
                {yearHolidays.map((h) => {
                  const d = new Date(h.date + "T00:00:00");
                  const isPast = h.date < today.toISOString().slice(0, 10);
                  return (
                    <li
                      key={h.id}
                      className="py-2.5 flex items-start gap-3 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded"
                      onClick={() => {
                        setViewYear(d.getFullYear());
                        setViewMonth(d.getMonth());
                      }}
                    >
                      <div
                        className={`text-center shrink-0 rounded-md px-2 py-1 w-12 ${
                          isPast
                            ? "bg-muted/40 text-muted-foreground"
                            : "bg-accent/15 text-accent"
                        }`}
                      >
                        <div className="text-[10px] uppercase font-semibold leading-none">
                          {d.toLocaleDateString("en-GB", { month: "short" })}
                        </div>
                        <div className="text-base font-bold leading-tight">
                          {d.getDate()}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-sm font-medium ${
                            isPast ? "text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {h.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {fmtDate(d)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        </div>
      )}
    </Layout>
  );
}
