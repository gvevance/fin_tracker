import { requireAuth } from "../auth-guard.js";
import { getExpensesForMonth, formatMoney, toExpenseDate } from "../expenses.js";

const monthInput =
  document.getElementById("month-picker") ||
  document.querySelector('input[name="month"]');
const listEl = document.getElementById("expense-list");
const errorEl = document.getElementById("list-error");
const emptyEl = document.getElementById("list-empty");
const summaryTitle = document.getElementById("summary-title");
const summaryTotal = document.getElementById("summary-total");
const summaryMeta = document.getElementById("summary-meta");
const summaryCategories = document.getElementById("summary-categories");

function showError(message) {
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  }
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(year, month) {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderSummary(year, month, expenses) {
  const label = monthLabel(year, month);
  let total = 0;
  let currency = "INR";
  const byCategory = new Map();

  for (const expense of expenses) {
    total += expense.amount;
    currency = expense.currency || currency;
    const cat = expense.category || "Other";
    byCategory.set(cat, (byCategory.get(cat) || 0) + expense.amount);
  }

  if (summaryTitle) summaryTitle.textContent = label;
  if (summaryTotal) summaryTotal.textContent = formatMoney(total, currency);
  if (summaryMeta) {
    summaryMeta.textContent = `${expenses.length} expense${expenses.length === 1 ? "" : "s"}`;
  }

  if (summaryCategories) {
    summaryCategories.innerHTML = "";
    const sorted = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
    for (const [category, amount] of sorted) {
      const li = document.createElement("li");
      li.className = "summary-categories__item";
      li.innerHTML = `<span>${escapeHtml(category)}</span><span>${formatMoney(amount, currency)}</span>`;
      summaryCategories.appendChild(li);
    }
  }
}

async function loadMonth(user) {
  if (errorEl) errorEl.classList.add("hidden");
  if (emptyEl) emptyEl.classList.add("hidden");
  if (listEl) listEl.innerHTML = "";
  if (summaryMeta) summaryMeta.textContent = "Loading summary…";

  if (!monthInput) {
    showError("Month picker is missing on this page.");
    return;
  }

  if (!monthInput.value) {
    monthInput.value = currentMonthValue();
  }

  const [year, month] = monthInput.value.split("-").map(Number);
  if (!year || !month) {
    showError("Choose a valid month.");
    return;
  }

  try {
    const expenses = await getExpensesForMonth(year, month);
    renderSummary(year, month, expenses);

    if (expenses.length === 0) {
      if (emptyEl) emptyEl.classList.remove("hidden");
      return;
    }

    for (const expense of expenses) {
      const date = toExpenseDate(expense.spentAt);
      if (!date) continue;
      const li = document.createElement("li");
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
      listEl?.appendChild(li);
    }
  } catch (err) {
    console.error(err);
    if (summaryTotal) summaryTotal.textContent = "—";
    if (summaryMeta) summaryMeta.textContent = "";
    if (!navigator.onLine) {
      showError("You are offline. Connect to load expenses.");
    } else {
      showError(err.message || "Could not load expenses.");
    }
  }
}

async function init() {
  if (!monthInput) {
    showError("This page failed to load. Hard refresh or clear site cache.");
    return;
  }

  if (!monthInput.value) {
    monthInput.value = currentMonthValue();
  }

  let user;
  try {
    if (summaryMeta) summaryMeta.textContent = "Checking sign-in…";
    user = await requireAuth();
  } catch (err) {
    console.error(err);
    showError(err.message || "Sign-in check failed.");
    if (summaryMeta) summaryMeta.textContent = "";
    return;
  }

  if (!user) return;

  await loadMonth(user);

  monthInput.addEventListener("change", () => {
    loadMonth(user);
  });
}

init();
