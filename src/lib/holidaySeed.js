// Kenya public holidays (fixed + Easter + Islamic) for any year.
const FIXED = [
  [1, 1, "New Year's Day"],
  [5, 1, "Labour Day"],
  [5, 8, "Test Day"],
  [6, 1, "Madaraka Day"],
  [10, 10, "Utamaduni Day"],
  [10, 20, "Mashujaa Day"],
  [12, 12, "Jamhuri Day"],
  [12, 25, "Christmas Day"],
  [12, 26, "Boxing Day"],
];
const ISLAMIC = {
  2024: ["2024-04-10", "2024-06-17"],
  2025: ["2025-03-31", "2025-06-07"],
  2026: ["2026-03-20", "2026-05-27"],
  2027: ["2027-03-09", "2027-05-16"],
  2028: ["2028-02-26", "2028-05-05"],
  2029: ["2029-02-14", "2029-04-24"],
  2030: ["2030-02-04", "2030-04-13"],
};

// Anonymous Gregorian Easter Sunday.
const easter = (y) => {
  const a = y % 19,
    b = Math.floor(y / 100),
    c = y % 100,
    d = Math.floor(b / 4),
    e = b % 4;
  const f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4),
    k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mo = Math.floor((h + l - 7 * m + 114) / 31);
  return new Date(Date.UTC(y, mo - 1, ((h + l - 7 * m + 114) % 31) + 1));
};
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
};

// Compute Kenya holidays for a given year.
export const computeHolidaysForYear = (year) => {
  const list = FIXED.map(([m, d, name]) => {
    const date = iso(new Date(Date.UTC(year, m - 1, d)));
    return { id: `ke-${date}`, date, name, country: "KE", year, type: "fixed" };
  });
  const e = easter(year);
  list.push({
    id: `ke-${iso(addDays(e, -2))}`,
    date: iso(addDays(e, -2)),
    name: "Good Friday",
    country: "KE",
    year,
    type: "movable",
  });
  list.push({
    id: `ke-${iso(addDays(e, 1))}`,
    date: iso(addDays(e, 1)),
    name: "Easter Monday",
    country: "KE",
    year,
    type: "movable",
  });
  const isl =
    ISLAMIC[year] ||
    ISLAMIC[2025].map((d) =>
      iso(
        addDays(
          new Date(d + "T00:00:00Z"),
          Math.round((year - 2025) * -10.875),
        ),
      ),
    );
  list.push({
    id: `ke-${isl[0]}`,
    date: isl[0],
    name: "Eid al-Fitr",
    country: "KE",
    year,
    type: "lunar",
  });
  list.push({
    id: `ke-${isl[1]}`,
    date: isl[1],
    name: "Eid al-Adha",
    country: "KE",
    year,
    type: "lunar",
  });
  return list.sort((a, b) => a.date.localeCompare(b.date));
};

// Years to keep populated.
export const targetYears = () => {
  const y = new Date().getUTCFullYear();
  return [y - 1, y, y + 1, y + 2];
};
