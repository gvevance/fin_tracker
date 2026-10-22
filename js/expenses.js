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

export async function addExpense(userId, { amount, currency, category, note, spentAt }) {
  return addDoc(collection(db, EXPENSES), {
    userId,
    amount,
    currency,
    category,
    note: note || "",
    spentAt: Timestamp.fromDate(spentAt),
    createdAt: serverTimestamp(),
  });
}

/** Fetches by user only (no composite index); filters month in the client. */
export async function getExpensesForMonth(userId, year, month) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const q = query(collection(db, EXPENSES), where("userId", "==", userId));
  const snapshot = await getDocs(q);

  const expenses = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

  return expenses
    .filter((expense) => {
      const spentAt = expense.spentAt;
      if (!spentAt) return false;
      const date = spentAt.toDate ? spentAt.toDate() : new Date(spentAt);
      return date >= start && date <= end;
    })
    .sort((a, b) => {
      const da = a.spentAt.toDate ? a.spentAt.toDate() : new Date(a.spentAt);
      const db_ = b.spentAt.toDate ? b.spentAt.toDate() : new Date(b.spentAt);
      return db_.getTime() - da.getTime();
    });
}

export function formatMoney(amount, currency = "INR") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
