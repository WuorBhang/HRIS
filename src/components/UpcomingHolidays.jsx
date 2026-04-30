import { useEffect, useState } from "react";
import { subscribeHolidays, getUpcomingHolidays } from "../lib/holidayService";
import {
  HOLIDAY_FETCH_WINDOW_DAYS,
  HOLIDAY_DISPLAY_WINDOW_DAYS,
} from "../lib/constants";

export default function UpcomingHolidays() {
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    // Detect holidays up to FETCH_WINDOW days ahead, but only surface those
    // that fall within the DISPLAY_WINDOW so the widget stays focused.
    const unsub = subscribeHolidays((list) => {
      const detected = getUpcomingHolidays(list, HOLIDAY_FETCH_WINDOW_DAYS);
      const seen = new Set();
      const deduped = [];
      for (const h of detected) {
        const key = `${h.date}|${(h.name || "").toLowerCase().trim()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(h);
      }
      setUpcoming(
        deduped.filter((h) => h.daysAway <= HOLIDAY_DISPLAY_WINDOW_DAYS),
      );
    });
    return () => unsub();
  }, []);

  if (upcoming.length === 0) return null;

  return (
    <div className="bg-card rounded-lg shadow p-5 mb-6 border-l-4 border-accent">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-primary">Upcoming public holidays</h3>
      </div>
      <ul className="space-y-2">
        {upcoming.map((h) => (
          <li
            key={h.id}
            className="flex items-center justify-between text-sm border-b border-border last:border-b-0 pb-2 last:pb-0"
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
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                h.daysAway === 0
                  ? "bg-accent text-accent-foreground"
                  : h.daysAway <= 3
                    ? "bg-accent/30 text-accent"
                    : "bg-muted/50 text-muted-foreground"
              }`}
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
