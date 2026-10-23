import { requireAuth } from "../auth-guard.js";
import {
  getExpensesForMonth,
  getUsernameMap,
  addedByLabel,
  formatMoney,
  toExpenseDate,
} from "../expenses.js";

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
const userFilter = document.getElementById("filter-user");
const categoryFilter = document.getElementById("filter-category");
const clearFiltersBtn = document.getElementById("clear-filters-btn");
const listHeading = document.getElementById("list-heading");

let monthExpenses = [];
let usernameByUid = new Map();

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

function selectedUser() {
  return userFilter?.value || "";
}

function selectedCategory() {
  return categoryFilter?.value || "";
}

function filtersActive() {
  return Boolean(selectedUser() || selectedCategory());
}

function fillSelect(select, values, allLabel) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = "";
  const all = document.createElement("option");
  all.value = "";
  all.textContent = allLabel;
  select.appendChild(all);
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
  if ([...select.options].some((opt) => opt.value === current)) {
    select.value = current;
  } else {
    select.value = "";
  }
}

function populateFilters(expenses) {
  const people = [
    ...new Set(expenses.map((expense) => addedByLabel(expense, usernameByUid))),
  ].sort((a, b) => a.localeCompare(b));
  const categories = [
    ...new Set(expenses.map((expense) => expense.category || "Other")),
  ].sort((a, b) => a.localeCompare(b));
  fillSelect(userFilter, people, "All people");
  fillSelect(categoryFilter, categories, "All categories");
}

function filteredExpenses() {
  const user = selectedUser();
  const category = selectedCategory();
  return monthExpenses.filter((expense) => {
    if (user && addedByLabel(expense, usernameByUid) !== user) return false;
    if (category && (expense.category || "Other") !== category) return false;
    return true;
  });
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
    const parts = [`${expenses.length} expense${expenses.length === 1 ? "" : "s"}`];
    if (selectedUser()) parts.push(`by ${selectedUser()}`);
    if (selectedCategory()) parts.push(`in ${selectedCategory()}`);
    summaryMeta.textContent = parts.join(" · ");
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

function renderList(expenses) {
  if (listEl) listEl.innerHTML = "";
  if (emptyEl) emptyEl.classList.add("hidden");
  if (clearFiltersBtn) clearFiltersBtn.disabled = !filtersActive();
  if (listHeading) {
    listHeading.textContent = filtersActive() ? "Filtered expenses" : "All expenses";
  }

  if (expenses.length === 0) {
    if (emptyEl) {
      emptyEl.textContent = filtersActive()
        ? "No expenses match these filters."
        : "No expenses for this month.";
      emptyEl.classList.remove("hidden");
    }
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
        <span class="expense-item__added-by">Added by ${escapeHtml(addedByLabel(expense, usernameByUid))}</span>
        ${expense.note ? `<span>${escapeHtml(expense.note)}</span>` : ""}
      </div>
    `;
    listEl?.appendChild(li);
  }
}

function applyFilters() {
  if (!monthInput?.value) return;
  const [year, month] = monthInput.value.split("-").map(Number);
  if (!year || !month) return;
  const visible = filteredExpenses();
  renderSummary(year, month, visible);
  renderList(visible);
}

function clearFilters() {
  if (userFilter) userFilter.value = "";
  if (categoryFilter) categoryFilter.value = "";
  applyFilters();
}

async function loadMonth() {
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
    const [expenses, names] = await Promise.all([
      getExpensesForMonth(year, month),
      getUsernameMap().catch(() => new Map()),
    ]);
    monthExpenses = expenses;
    usernameByUid = names;
    if (userFilter) userFilter.value = "";
    if (categoryFilter) categoryFilter.value = "";
    populateFilters(expenses);
    applyFilters();
  } catch (err) {
    console.error(err);
    monthExpenses = [];
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
    showError("This page failed to load. Hard refresh or clear site data.");
    return;
  }

  if (!monthInput.value) {
    monthInput.value = currentMonthValue();
  }

  try {
    if (summaryMeta) summaryMeta.textContent = "Checking sign-in…";
    const user = await requireAuth();
    if (!user) return;
  } catch (err) {
    console.error(err);
    showError(err.message || "Sign-in check failed.");
    if (summaryMeta) summaryMeta.textContent = "";
    return;
  }

  userFilter?.addEventListener("change", applyFilters);
  categoryFilter?.addEventListener("change", applyFilters);
  clearFiltersBtn?.addEventListener("click", clearFilters);
  monthInput.addEventListener("change", () => {
    loadMonth();
  });

  await loadMonth();
}

init();
