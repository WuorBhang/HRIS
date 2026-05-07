// Public holidays calendar (read-only — auto-seeded by Cloud Function).
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { subscribeHolidays } from "../../lib/holidayService";
import { Card, PageHeader } from "../../lib/ui";
import Layout from "../../components/Layout";

const DAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
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

// Build 6-week grid (Mon-first).
const buildGrid = (year, month) => {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from(
    { length: 42 },
    (_, i) => new Date(start.getTime() + i * 86400000),
  );
};

export default function PublicHolidays() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [items, setItems] = useState([]);

  useEffect(() => subscribeHolidays((all) => setItems(all)), []);

  const byKey = useMemo(
    () => Object.fromEntries(items.map((h) => [h.date, h])),
    [items],
  );
  const yearsAvail = useMemo(
    () =>
      [...new Set(items.map((h) => Number(h.date.slice(0, 4))))].sort(
        (a, b) => b - a,
      ),
    [items],
  );
  const grid = useMemo(() => buildGrid(year, month), [year, month]);

  // Prev / next month.
  const nav = (d) => {
    let m = month + d,
      y = year;
    if (m < 0) {
      m = 11;
      y--;
    } else if (m > 11) {
      m = 0;
      y++;
    }
    setMonth(m);
    setYear(y);
  };

  const ymd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return (
    <Layout>
      <PageHeader
        title="Public holidays"
        subtitle="Kenya — auto-seeded yearly."
      />
      <div className="grid lg:grid-cols-[1fr_220px] gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => nav(-1)}
              className="p-2 hover:bg-muted/30 rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="font-semibold text-primary">
              {MONTHS[month]} {year}
            </div>
            <button
              onClick={() => nav(1)}
              className="p-2 hover:bg-muted/30 rounded"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-xs text-center text-muted-foreground mb-1">
            {DAY.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d, i) => {
              const inMonth = d.getMonth() === month;
              const k = ymd(d);
              const h = byKey[k];
              const isToday = ymd(d) === ymd(today);
              const style = isToday
                ? {
                    backgroundColor: "#1b4f72",
                    borderColor: "#1b4f72",
                    color: "#fff",
                  }
                : h
                  ? {
                      backgroundColor: "#f39c12",
                      borderColor: "#f39c12",
                      color: "#fff",
                    }
                  : undefined;
              const baseBg = inMonth
                ? "bg-card"
                : "bg-muted/20 text-muted-foreground/50";
              return (
                <div
                  key={i}
                  style={style}
                  className={`min-h-[64px] p-1 rounded border text-xs ${style ? "" : baseBg} ${style ? "" : "border-border"}`}
                >
                  <div className="font-medium">{d.getDate()}</div>
                  {h && (
                    <div
                      className={`text-[10px] mt-0.5 truncate ${style ? "" : "text-primary"}`}
                      title={h.name}
                    >
                      {h.name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded"
                style={{ backgroundColor: "#1b4f72" }}
              />
              <span className="text-muted-foreground">Today</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded"
                style={{ backgroundColor: "#f39c12" }}
              />
              <span className="text-muted-foreground">Public holiday</span>
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold text-primary mb-3">Years</h2>
          <ul className="space-y-1">
            {yearsAvail.map((y) => (
              <li key={y}>
                <button
                  onClick={() => setYear(y)}
                  className={`w-full text-left px-3 py-1.5 rounded text-sm ${y === year ? "bg-primary text-white" : "hover:bg-muted/30"}`}
                >
                  {y}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Layout>
  );
}
