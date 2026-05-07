// Holiday Firestore subscriptions + auto-seed.
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
import { COLLECTIONS } from "./constants";
import { computeHolidaysForYear, targetYears } from "./holidaySeed";

let pending = null;

// Sync seeded Kenya holidays to match holidaySeed.js for target years
// (admin-only via rules). Adds missing entries and removes stale ones so
// modifying the FIXED list is reflected automatically on next admin load.
export const seedPublicHolidaysIfEmpty = () => {
  if (pending) return pending;
  pending = (async () => {
    const years = targetYears();
    const col = collection(db, COLLECTIONS.PUBLIC_HOLIDAYS);
    const snap = await getDocs(query(col, where("year", "in", years)));

    // Desired computed set keyed by id.
    const desired = new Map();
    for (const y of years)
      for (const h of computeHolidaysForYear(y)) desired.set(h.id, h);

    const existingIds = new Set(snap.docs.map((d) => d.id));

    const toAdd = [];
    for (const [id, h] of desired) if (!existingIds.has(id)) toAdd.push(h);

    // Remove stale seeded docs (id prefix `ke-`) for target years that no
    // longer exist in the computed set — keeps frontend in sync with code.
    const toDelete = snap.docs.filter(
      (d) => d.id.startsWith("ke-") && !desired.has(d.id),
    );

    if (!toAdd.length && !toDelete.length) return;

    const batch = writeBatch(db);
    for (const h of toAdd) batch.set(doc(col, h.id), h);
    for (const d of toDelete) batch.delete(doc(col, d.id));
    await batch.commit();
  })().catch((e) => {
    pending = null;
    throw e;
  });
  return pending;
};

// Subscribe to all holidays sorted by date.
export const subscribeHolidays = (cb) =>
  onSnapshot(query(collection(db, COLLECTIONS.PUBLIC_HOLIDAYS)), (s) =>
    cb(
      s.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    ),
  );

// Holidays within next N days.
export const getUpcomingHolidays = (list, windowDays) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return list
    .map((h) => {
      const dateObj = new Date(h.date + "T00:00:00");
      const daysAway = Math.round((dateObj - today) / 86400000);
      return { ...h, dateObj, daysAway };
    })
    .filter((h) => h.daysAway >= 0 && h.daysAway <= windowDays)
    .sort((a, b) => a.daysAway - b.daysAway);
};
