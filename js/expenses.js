import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "./firebase.js";

const EXPENSES = "expenses";

export const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Shopping",
  "Health",
  "Other",
];

export function resolveCategoryName(typed, knownCategories) {
  const value = String(typed || "").trim();
  if (!value) return "Other";
  const match = knownCategories.find(
    (name) => name.toLowerCase() === value.toLowerCase()
  );
  return match || value;
}

export async function getKnownCategories() {
  const names = new Set(DEFAULT_CATEGORIES);
  const snapshot = await getDocs(collection(db, EXPENSES));
  for (const docSnap of snapshot.docs) {
    const category = docSnap.data()?.category;
    if (typeof category === "string" && category.trim()) {
      names.add(category.trim());
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** Parse `<input type="date">` value in local time (avoids UTC day shift). */
export function parseDateInputValue(value) {
  const [y, m, d] = String(value).split("-").map(Number);
  if (!y || !m || !d) {
    return new Date(Number.NaN);
  }
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function monthKeyFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function toExpenseDate(spentAt) {
  if (!spentAt) return null;
  if (typeof spentAt.toDate === "function") {
    return spentAt.toDate();
  }
  if (typeof spentAt.seconds === "number") {
    return new Date(spentAt.seconds * 1000);
  }
  const parsed = new Date(spentAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function expenseInCalendarMonth(spentAt, year, month) {
  const date = toExpenseDate(spentAt);
  if (!date) return false;
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

export async function addExpense(userId, { amount, currency, category, note, spentAt, addedBy }) {
  const spentDate = spentAt instanceof Date ? spentAt : parseDateInputValue(spentAt);
  if (Number.isNaN(spentDate.getTime())) {
    throw new Error("Invalid expense date.");
  }

  const username = String(addedBy || "").trim().toLowerCase();
  if (!username) {
    throw new Error("Could not record who added this expense. Sign in again.");
  }

  return addDoc(collection(db, EXPENSES), {
    userId,
    addedBy: username,
    amount,
    currency,
    category,
    note: note || "",
    spentAt: Timestamp.fromDate(spentDate),
    monthKey: monthKeyFromDate(spentDate),
    createdAt: serverTimestamp(),
  });
}

export async function getUsernameMap() {
  const snapshot = await getDocs(collection(db, "userProfiles"));
  const map = new Map();
  for (const docSnap of snapshot.docs) {
    const username = docSnap.data()?.username;
    if (typeof username === "string" && username) {
      map.set(docSnap.id, username);
    }
  }
  return map;
}

export function addedByLabel(expense, usernameByUid) {
  const stored = String(expense.addedBy || "").trim();
  if (stored) return stored;
  const mapped = usernameByUid?.get(expense.userId);
  if (mapped) return mapped;
  return "Unknown";
}

/** Shared household report: every signed-in user sees all expenses for the month. */
export async function getExpensesForMonth(year, month) {
  const targetKey = `${year}-${String(month).padStart(2, "0")}`;

  const snapshot = await getDocs(collection(db, EXPENSES));

  const expenses = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

  return expenses
    .filter((expense) => {
      if (expense.monthKey === targetKey) return true;
      return expenseInCalendarMonth(expense.spentAt, year, month);
    })
    .sort((a, b) => {
      const da = toExpenseDate(a.spentAt)?.getTime() ?? 0;
      const db_ = toExpenseDate(b.spentAt)?.getTime() ?? 0;
      return db_ - da;
    });
}

export function formatMoney(amount, currency = "INR") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
