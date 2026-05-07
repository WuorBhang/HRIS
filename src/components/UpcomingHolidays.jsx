// Upcoming Kenya public holidays widget.
import { useEffect, useState } from "react";
import { subscribeHolidays, getUpcomingHolidays } from "../lib/holidayService";
import { HOLIDAY_FETCH_DAYS, HOLIDAY_DISPLAY_DAYS } from "../lib/constants";

export default function UpcomingHolidays({ horizontal = false }) {
  const [list, setList] = useState([]);
  useEffect(() => {
    const unsub = subscribeHolidays((all) => {
      const seen = new Set();
      const deduped = [];
      for (const h of getUpcomingHolidays(all, HOLIDAY_FETCH_DAYS)) {
        const k = `${h.date}|${(h.name || "").toLowerCase()}`;
        if (!seen.has(k)) {
          seen.add(k);
          deduped.push(h);
        }
      }
      setList(deduped.filter((h) => h.daysAway <= HOLIDAY_DISPLAY_DAYS));
    });
    return () => unsub();
  }, []);
  if (!list.length) return null;

  if (horizontal) {
    return (
      <div
        className="rounded-lg shadow px-3 py-3 sm:px-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
        style={{ backgroundColor: "#f39c12", color: "#1b4f72" }}
      >
        <h3
          className="font-semibold text-sm sm:whitespace-nowrap"
          style={{ color: "#1b4f72" }}
        >
          Upcoming public holidays:
        </h3>
        <ul className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 sm:flex-wrap">
          {list.map((h, i) => (
            <li
              key={h.id}
              className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm sm:whitespace-nowrap sm:pr-3 ${
                i === list.length - 1 ? "" : "sm:border-r"
              }`}
              style={{
                color: "#1b4f72",
                borderColor: "rgba(27,79,114,0.3)",
              }}
            >
              <span className="font-semibold">{h.name}</span>
              <span className="text-xs opacity-80">
                {h.dateObj.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{
                  backgroundColor: "#1b4f72",
                  color: "#f39c12",
                }}
              >
                {h.daysAway === 0
                  ? "Today"
                  : h.daysAway === 1
                    ? "Tomorrow"
                    : `In ${h.daysAway}d`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow p-5 mb-6 border-l-4 border-accent">
      <h3 className="font-semibold text-primary mb-3">
        Upcoming public holidays
      </h3>
      <ul className="space-y-2">
        {list.map((h) => (
          <li
            key={h.id}
            className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-2 last:pb-0"
          >
            <div>
              <div className="font-medium">{h.name}</div>
              <div className="text-xs text-muted-foreground">
                {h.dateObj.toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${h.daysAway === 0 ? "bg-accent text-accent-foreground" : h.daysAway <= 3 ? "bg-accent/30 text-accent" : "bg-muted/50 text-muted-foreground"}`}
            >
              {h.daysAway === 0
                ? "Today"
                : h.daysAway === 1
                  ? "Tomorrow"
                  : `In ${h.daysAway} days`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
