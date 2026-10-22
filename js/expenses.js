import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "./firebase.js";

const EXPENSES = "expenses";

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

export async function addExpense(userId, { amount, currency, category, note, spentAt }) {
  const spentDate = spentAt instanceof Date ? spentAt : parseDateInputValue(spentAt);
  if (Number.isNaN(spentDate.getTime())) {
    throw new Error("Invalid expense date.");
  }

  return addDoc(collection(db, EXPENSES), {
    userId,
    amount,
    currency,
    category,
    note: note || "",
    spentAt: Timestamp.fromDate(spentDate),
    monthKey: monthKeyFromDate(spentDate),
    createdAt: serverTimestamp(),
  });
}

/** Fetches by user only (no composite index); filters month in the client. */
export async function getExpensesForMonth(userId, year, month) {
  const targetKey = `${year}-${String(month).padStart(2, "0")}`;

  const q = query(collection(db, EXPENSES), where("userId", "==", userId));
  const snapshot = await getDocs(q);

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
