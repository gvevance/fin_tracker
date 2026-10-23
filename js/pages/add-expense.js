import { requireAuth } from "../auth-guard.js";
import { usernameFromUser } from "../auth.js";
import { addExpense, parseDateInputValue } from "../expenses.js";

const form = document.getElementById("expense-form");
const errorEl = document.getElementById("form-error");
const successEl = document.getElementById("form-success");
const dateInput = document.getElementById("spent-at");
const saveBtn = form?.querySelector('button[type="submit"]');

function setDateToToday() {
  if (!dateInput) return;
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  dateInput.value = `${now.getFullYear()}-${month}-${day}`;
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
  successEl.classList.add("hidden");
}

function showSuccess(message) {
  successEl.textContent = message;
  successEl.classList.remove("hidden");
  errorEl.classList.add("hidden");
}

setDateToToday();

let user = null;
let saving = false;

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (saving) return;

    if (!user) {
      showError("Still checking sign-in. Wait a moment and try again.");
      return;
    }

    errorEl.classList.add("hidden");
    successEl.classList.add("hidden");

    const data = new FormData(form);
    const amount = parseFloat(data.get("amount"), 10);

    if (!Number.isFinite(amount) || amount <= 0) {
      showError("Enter a valid amount greater than zero.");
      return;
    }

    const spentAt = parseDateInputValue(data.get("spentAt"));
    if (Number.isNaN(spentAt.getTime())) {
      showError("Choose a valid date.");
      return;
    }

    saving = true;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving…";
    }

    try {
      await addExpense(user.uid, {
        amount,
        currency: data.get("currency") || "INR",
        category: data.get("category") || "Other",
        note: data.get("note") || "",
        spentAt,
        addedBy: usernameFromUser(user),
      });
      showSuccess("Expense saved.");
      form.reset();
      setDateToToday();
    } catch (err) {
      if (!navigator.onLine) {
        showError("You are offline. Connect to save expenses.");
      } else {
        showError(err.message || "Could not save expense.");
      }
    } finally {
      saving = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save expense";
      }
    }
});

user = await requireAuth();
