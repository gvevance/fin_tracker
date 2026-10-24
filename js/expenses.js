import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  writeBatch,
  Timestamp,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "./firebase.js";

const EXPENSES = "expenses";
const CATEGORIES = "categories";
const HISTORY = "history";

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

export async function rememberCategory(name) {
  const display = String(name || "").trim();
  if (!display) return;
  await setDoc(
    doc(db, CATEGORIES, display.toLowerCase()),
    { name: display },
    { merge: true }
  );
}

function sortedCategoryNames(names) {
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

export async function getKnownCategories() {
  const names = new Map();
  for (const category of DEFAULT_CATEGORIES) {
    names.set(category.toLowerCase(), category);
  }

  const saved = await getDocs(collection(db, CATEGORIES));
  for (const docSnap of saved.docs) {
    const category = docSnap.data()?.name;
    if (typeof category === "string" && category.trim()) {
      const display = category.trim();
      names.set(display.toLowerCase(), display);
    }
  }

  return sortedCategoryNames(names);
}

/** Fills the shared category list from past expenses. Do not block the Add expense screen on this. */
export async function backfillCategoriesFromExpenses() {
  const snapshot = await getDocs(collection(db, EXPENSES));
  const found = [];
  for (const docSnap of snapshot.docs) {
    const category = docSnap.data()?.category;
    if (typeof category === "string" && category.trim()) {
      const display = category.trim();
      found.push(display);
      rememberCategory(display).catch(() => {});
    }
  }
  return found;
}

/** Parse `<input type="date">` value in local time (avoids UTC day shift). */
export function parseDateInputValue(value) {
  const [y, m, d] = String(value).split("-").map(Number);
  if (!y || !m || !d) {
    return new Date(Number.NaN);
  }
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function formatDateInputValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
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

function requireActor(actor) {
  const username = String(actor || "").trim().toLowerCase();
  if (!username) {
    throw new Error("Could not record who made this change. Sign in again.");
  }
  return username;
}

function toTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value;
  if (value instanceof Date) return Timestamp.fromDate(value);
  const date = toExpenseDate(value);
  return date ? Timestamp.fromDate(date) : null;
}

function historyPayload(type, actor, expense, extra = {}) {
  return {
    type,
    actor,
    expenseId: expense.id || "",
    amount: expense.amount,
    currency: expense.currency || "INR",
    category: expense.category || "Other",
    note: expense.note || "",
    spentAt: toTimestamp(expense.spentAt),
    addedBy: String(expense.addedBy || "").trim().toLowerCase(),
    monthKey: expense.monthKey || "",
    createdAt: serverTimestamp(),
    ...extra,
  };
}

export async function addExpense(userId, { amount, currency, category, note, spentAt, addedBy }) {
  const spentDate = spentAt instanceof Date ? spentAt : parseDateInputValue(spentAt);
  if (Number.isNaN(spentDate.getTime())) {
    throw new Error("Invalid expense date.");
  }

  const username = requireActor(addedBy);
  const spentAtTs = Timestamp.fromDate(spentDate);
  const monthKey = monthKeyFromDate(spentDate);
  const expenseRef = doc(collection(db, EXPENSES));
  const historyRef = doc(collection(db, HISTORY));
  const batch = writeBatch(db);

  batch.set(expenseRef, {
    userId,
    addedBy: username,
    amount,
    currency,
    category,
    note: note || "",
    spentAt: spentAtTs,
    monthKey,
    createdAt: serverTimestamp(),
  });
  batch.set(
    historyRef,
    historyPayload("added", username, {
      id: expenseRef.id,
      amount,
      currency,
      category,
      note: note || "",
      spentAt: spentAtTs,
      addedBy: username,
      monthKey,
    })
  );
  await batch.commit();
  await rememberCategory(category).catch((err) => {
    console.error("Could not save category:", err);
  });
  return expenseRef;
}

export async function getExpense(expenseId) {
  const id = String(expenseId || "").trim();
  if (!id) {
    throw new Error("Missing expense.");
  }
  const snap = await getDoc(doc(db, EXPENSES, id));
  if (!snap.exists()) {
    throw new Error("That expense was not found.");
  }
  return { id: snap.id, ...snap.data() };
}

export async function updateExpense(expenseId, { amount, currency, category, note, spentAt, actor }) {
  const id = String(expenseId || "").trim();
  if (!id) {
    throw new Error("Missing expense.");
  }

  const username = requireActor(actor);
  const spentDate = spentAt instanceof Date ? spentAt : parseDateInputValue(spentAt);
  if (Number.isNaN(spentDate.getTime())) {
    throw new Error("Invalid expense date.");
  }

  const previous = await getExpense(id);
  const spentAtTs = Timestamp.fromDate(spentDate);
  const monthKey = monthKeyFromDate(spentDate);
  const expenseRef = doc(db, EXPENSES, id);
  const historyRef = doc(collection(db, HISTORY));
  const batch = writeBatch(db);

  batch.update(expenseRef, {
    amount,
    currency,
    category,
    note: note || "",
    spentAt: spentAtTs,
    monthKey,
  });
  batch.set(
    historyRef,
    historyPayload(
      "modified",
      username,
      {
        id,
        amount,
        currency,
        category,
        note: note || "",
        spentAt: spentAtTs,
        addedBy: previous.addedBy,
        monthKey,
      },
      {
        previousAmount: previous.amount ?? null,
        previousCategory: previous.category || "",
        previousNote: previous.note || "",
        previousSpentAt: toTimestamp(previous.spentAt),
      }
    )
  );
  await batch.commit();
  await rememberCategory(category).catch((err) => {
    console.error("Could not save category:", err);
  });
}

export async function deleteExpense(expenseId, { actor } = {}) {
  const id = String(expenseId || "").trim();
  if (!id) {
    throw new Error("Missing expense.");
  }

  const username = requireActor(actor);
  const expense = await getExpense(id);
  const historyRef = doc(collection(db, HISTORY));
  const batch = writeBatch(db);
  batch.set(
    historyRef,
    historyPayload("deleted", username, {
      ...expense,
      id,
    })
  );
  batch.delete(doc(db, EXPENSES, id));
  await batch.commit();
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

function historyTime(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

/** Shared activity log: every signed-in user sees adds, edits, and deletes. */
export async function getHistory() {
  const snapshot = await getDocs(collection(db, HISTORY));
  return snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))
    .sort((a, b) => historyTime(b.createdAt) - historyTime(a.createdAt));
}

export function formatMoney(amount, currency = "INR") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
