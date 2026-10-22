import { requireAuth } from "../auth-guard.js";
import { getExpensesForMonth, formatMoney } from "../expenses.js";
import { Timestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const user = await requireAuth();
if (!user) return;

const form = document.getElementById("month-form");
const listEl = document.getElementById("expense-list");
const totalEl = document.getElementById("month-total");
const errorEl = document.getElementById("list-error");
const emptyEl = document.getElementById("list-empty");

const monthInput = form.querySelector('[name="month"]');
const now = new Date();
monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

function spentAtToDate(spentAt) {
  if (spentAt instanceof Timestamp) {
    return spentAt.toDate();
  }
  return new Date(spentAt);
}

async function loadMonth() {
  errorEl.classList.add("hidden");
  listEl.innerHTML = "";
  emptyEl.classList.add("hidden");
  totalEl.textContent = "";

  const [year, month] = monthInput.value.split("-").map(Number);
  if (!year || !month) return;

  try {
    const expenses = await getExpensesForMonth(user.uid, year, month);
    let total = 0;
    let currency = "INR";

    if (expenses.length === 0) {
      emptyEl.classList.remove("hidden");
      return;
    }

    for (const expense of expenses) {
      total += expense.amount;
      currency = expense.currency || currency;
      const li = document.createElement("li");
      const date = spentAtToDate(expense.spentAt);
      li.className = "expense-item";
      li.innerHTML = `
        <div class="expense-item__main">
          <span class="expense-item__category">${escapeHtml(expense.category)}</span>
          <span class="expense-item__amount">${formatMoney(expense.amount, expense.currency)}</span>
        </div>
        <div class="expense-item__meta">
          <time datetime="${date.toISOString()}">${date.toLocaleDateString()}</time>
          ${expense.note ? `<span>${escapeHtml(expense.note)}</span>` : ""}
        </div>
      `;
      listEl.appendChild(li);
    }

    totalEl.textContent = `Total: ${formatMoney(total, currency)}`;
  } catch (err) {
    if (!navigator.onLine) {
      errorEl.textContent = "You are offline. Connect to load expenses.";
    } else {
      errorEl.textContent = err.message || "Could not load expenses.";
    }
    errorEl.classList.remove("hidden");
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  loadMonth();
});

loadMonth();
