import { requireAuth } from "../auth-guard.js";
import {
  getHistory,
  formatMoney,
  toExpenseDate,
  formatDateInputValue,
} from "../expenses.js";

const listEl = document.getElementById("history-list");
const statusEl = document.getElementById("history-status");
const errorEl = document.getElementById("history-error");

function showError(message) {
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function actionLabel(type) {
  if (type === "deleted") return "Deleted";
  if (type === "modified") return "Modified";
  return "Added";
}

function formatWhen(value) {
  const date = toExpenseDate(value);
  if (!date) return "";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatSpentOn(value) {
  const date = toExpenseDate(value);
  if (!date) return "";
  return date.toLocaleDateString();
}

function changeSummary(entry) {
  if (entry.type !== "modified") return "";
  const parts = [];
  if (
    entry.previousAmount != null &&
    Number(entry.previousAmount) !== Number(entry.amount)
  ) {
    parts.push(
      `${formatMoney(entry.previousAmount, entry.currency)} → ${formatMoney(entry.amount, entry.currency)}`
    );
  }
  if (
    entry.previousCategory &&
    entry.previousCategory !== (entry.category || "")
  ) {
    parts.push(`${entry.previousCategory} → ${entry.category}`);
  }
  const previousDate = formatDateInputValue(toExpenseDate(entry.previousSpentAt));
  const nextDate = formatDateInputValue(toExpenseDate(entry.spentAt));
  if (previousDate && nextDate && previousDate !== nextDate) {
    parts.push(`${formatSpentOn(entry.previousSpentAt)} → ${formatSpentOn(entry.spentAt)}`);
  }
  if ((entry.previousNote || "") !== (entry.note || "")) {
    parts.push("Note updated");
  }
  return parts.join(" · ");
}

function renderHistory(entries) {
  if (listEl) listEl.innerHTML = "";
  if (!entries.length) {
    if (statusEl) {
      statusEl.textContent = "No history yet.";
      statusEl.classList.remove("hidden");
    }
    return;
  }

  if (statusEl) statusEl.classList.add("hidden");

  for (const entry of entries) {
    const li = document.createElement("li");
    const type = entry.type || "added";
    li.className = `expense-item history-item history-item--${type}`;
    const changes = changeSummary(entry);
    const spentOn = formatSpentOn(entry.spentAt);
    const when = formatWhen(entry.createdAt);
    li.innerHTML = `
      <div class="expense-item__main">
        <span class="history-action history-action--${escapeHtml(type)}">${escapeHtml(actionLabel(type))}</span>
        <span class="expense-item__amount">${formatMoney(entry.amount, entry.currency)}</span>
      </div>
      <div class="expense-item__meta">
        <span class="expense-item__category">${escapeHtml(entry.category || "Other")}</span>
        ${spentOn ? `<time datetime="${escapeHtml(toExpenseDate(entry.spentAt)?.toISOString() || "")}">${escapeHtml(spentOn)}</time>` : ""}
        ${entry.note ? `<span>${escapeHtml(entry.note)}</span>` : ""}
      </div>
      <div class="expense-item__meta">
        <span>By ${escapeHtml(entry.actor || "Unknown")}${when ? ` · ${escapeHtml(when)}` : ""}</span>
        ${
          entry.addedBy && entry.addedBy !== entry.actor
            ? `<span class="expense-item__added-by">Originally added by ${escapeHtml(entry.addedBy)}</span>`
            : ""
        }
        ${changes ? `<span>${escapeHtml(changes)}</span>` : ""}
      </div>
    `;
    listEl?.appendChild(li);
  }
}

async function init() {
  try {
    const user = await requireAuth();
    if (!user) return;
    const entries = await getHistory();
    renderHistory(entries);
  } catch (err) {
    console.error(err);
    if (statusEl) statusEl.classList.add("hidden");
    if (!navigator.onLine) {
      showError("You are offline. Connect to load history.");
    } else {
      showError(err.message || "Could not load history.");
    }
  }
}

init();
