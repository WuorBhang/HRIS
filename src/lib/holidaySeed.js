// Kenya public holiday generator.
// Computes fixed + movable (Easter-based) + approximate Islamic holidays
// for any given year. Used by holidayService to auto-seed Firestore on
// year rollover so admins never have to maintain the list manually.

// Anonymous Gregorian algorithm — returns Easter Sunday for `year`.
function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date, days) {
  const r = new Date(date);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

function isoDate(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

const FIXED = [
  { name: "New Year's Day", month: 1, day: 1 },
  { name: "Labour Day", month: 5, day: 1 },
  { name: "Madaraka Day", month: 6, day: 1 },
  { name: "Utamaduni Day", month: 10, day: 10 },
  { name: "Mashujaa Day", month: 10, day: 20 },
  { name: "Jamhuri Day", month: 12, day: 12 },
  { name: "Christmas Day", month: 12, day: 25 },
  { name: "Boxing Day", month: 12, day: 26 },
];

// Pre-computed Islamic holiday dates for Kenya (from Diyanet / official
// gazettes). Lunar calendar is not deterministic, so we keep a rolling table
// and fall back to a rough approximation when a year isn't listed.
const ISLAMIC = {
  2024: { eidFitr: "2024-04-10", eidAdha: "2024-06-17" },
  2025: { eidFitr: "2025-03-31", eidAdha: "2025-06-07" },
  2026: { eidFitr: "2026-03-20", eidAdha: "2026-05-27" },
  2027: { eidFitr: "2027-03-09", eidAdha: "2027-05-16" },
  2028: { eidFitr: "2028-02-26", eidAdha: "2028-05-05" },
  2029: { eidFitr: "2029-02-14", eidAdha: "2029-04-24" },
  2030: { eidFitr: "2030-02-04", eidAdha: "2030-04-13" },
};

function approximateIslamic(year) {
  // Rough fallback: each Hijri year drifts ~10.875 days earlier in the
  // Gregorian calendar. Anchor on 2025 known dates.
  const anchorYear = 2025;
  const anchor = ISLAMIC[anchorYear];
  const driftDays = Math.round((year - anchorYear) * -10.875);
  const shift = (iso) => isoDate(addDays(new Date(iso + "T00:00:00Z"), driftDays));
  return { eidFitr: shift(anchor.eidFitr), eidAdha: shift(anchor.eidAdha) };
}

export function computeHolidaysForYear(year) {
  const list = [];

  for (const h of FIXED) {
    const date = isoDate(new Date(Date.UTC(year, h.month - 1, h.day)));
    list.push({
      id: `ke-${date}`,
      date,
      name: h.name,
      country: "KE",
      year,
      type: "fixed",
    });
  }

  const easter = getEasterSunday(year);
  list.push({
    id: `ke-${isoDate(addDays(easter, -2))}`,
    date: isoDate(addDays(easter, -2)),
    name: "Good Friday",
    country: "KE",
    year,
    type: "movable",
  });
  list.push({
    id: `ke-${isoDate(addDays(easter, 1))}`,
    date: isoDate(addDays(easter, 1)),
    name: "Easter Monday",
    country: "KE",
    year,
    type: "movable",
  });

  const islamic = ISLAMIC[year] || approximateIslamic(year);
  list.push({
    id: `ke-${islamic.eidFitr}`,
    date: islamic.eidFitr,
    name: "Eid al-Fitr",
    country: "KE",
    year,
    type: ISLAMIC[year] ? "lunar" : "lunar_approx",
  });
  list.push({
    id: `ke-${islamic.eidAdha}`,
    date: islamic.eidAdha,
    name: "Eid al-Adha",
    country: "KE",
    year,
    type: ISLAMIC[year] ? "lunar" : "lunar_approx",
  });

  return list.sort((a, b) => a.date.localeCompare(b.date));
}

// Years to keep populated: previous (history), current, and next 2 (planning).
export function targetYears(now = new Date()) {
  const y = now.getUTCFullYear();
  return [y - 1, y, y + 1, y + 2];
}
