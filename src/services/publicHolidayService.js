import {
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  query, where, serverTimestamp, orderBy,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export async function addPublicHoliday(data) {
  const ref = await addDoc(collection(db, "publicHolidays"), {
    ...data,
    country: data.country || "KE",
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export async function getPublicHolidays(year) {
  const q = year
    ? query(collection(db, "publicHolidays"), where("year", "==", year), orderBy("date", "asc"))
    : query(collection(db, "publicHolidays"), orderBy("date", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updatePublicHoliday(id, data) {
  await updateDoc(doc(db, "publicHolidays", id), { ...data, updatedAt: serverTimestamp() });
}

export async function deletePublicHoliday(id) {
  await deleteDoc(doc(db, "publicHolidays", id));
}

// Returns Set of date strings ("YYYY-MM-DD") for fast lookup
export async function getHolidayDateSet(year) {
  const holidays = await getPublicHolidays(year);
  return new Set(holidays.map((h) => h.date));
}
