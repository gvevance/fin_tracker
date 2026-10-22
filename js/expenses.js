import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
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

export async function getExpensesForMonth(userId, year, month) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const q = query(
    collection(db, EXPENSES),
    where("userId", "==", userId),
    where("spentAt", ">=", Timestamp.fromDate(start)),
    where("spentAt", "<=", Timestamp.fromDate(end)),
    orderBy("spentAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export function formatMoney(amount, currency = "INR") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
