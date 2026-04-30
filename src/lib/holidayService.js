import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { COLLECTIONS, UPCOMING_HOLIDAY_WINDOW_DAYS } from "./constants";
import { computeHolidaysForYear, targetYears } from "./holidaySeed";

let ensurePromise = null;

/**
 * Make sure Firestore has Kenya public holidays for the previous, current,
 * and next two years. Safe (and cheap) to call repeatedly — only writes
 * the years that don't already have entries. Admin-only by Firestore rules.
 *
 * Replaces the old static seed: when a new year starts, the next admin
 * login automatically populates fixed + Easter-derived + Islamic holidays
 * for it without requiring a redeploy.
 */
export async function ensureHolidaysForCurrentYears() {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    const years = targetYears();
    const colRef = collection(db, COLLECTIONS.PUBLIC_HOLIDAYS);
    const existing = await getDocs(query(colRef, where("year", "in", years)));
    const haveYears = new Set(existing.docs.map((d) => d.data().year));

    const missing = years.filter((y) => !haveYears.has(y));
    if (missing.length === 0) return { written: 0, years: [] };

    const batch = writeBatch(db);
    let written = 0;
    for (const y of missing) {
      for (const h of computeHolidaysForYear(y)) {
        batch.set(doc(colRef, h.id), h);
        written++;
      }
    }
    await batch.commit();
    return { written, years: missing };
  })().catch((err) => {
    ensurePromise = null;
    throw err;
  });
  return ensurePromise;
}

// Backwards-compat name still used by AuthContext.
export const seedPublicHolidaysIfEmpty = ensureHolidaysForCurrentYears;

export function subscribeHolidays(callback) {
  const q = query(collection(db, COLLECTIONS.PUBLIC_HOLIDAYS));
  return onSnapshot(q, (snap) => {
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => a.date.localeCompare(b.date));
    callback(list);
  });
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysBetween(a, b) {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function getUpcomingHolidays(holidays, windowDays = UPCOMING_HOLIDAY_WINDOW_DAYS) {
  const today = startOfDay();
  return holidays
    .map((h) => {
      const date = new Date(h.date + "T00:00:00");
      const diff = daysBetween(today, date);
      return { ...h, dateObj: date, daysAway: diff };
    })
    .filter((h) => h.daysAway >= 0 && h.daysAway <= windowDays)
    .sort((a, b) => a.daysAway - b.daysAway);
}
