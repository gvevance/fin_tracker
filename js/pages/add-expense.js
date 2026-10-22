import { requireAuth } from "../auth-guard.js";
import { addExpense } from "../expenses.js";

const user = await requireAuth();
if (!user) return;

const form = document.getElementById("expense-form");
const errorEl = document.getElementById("form-error");
const successEl = document.getElementById("form-success");

const dateInput = form.querySelector('[name="spentAt"]');

function setDateToToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  dateInput.value = `${now.getFullYear()}-${month}-${day}`;
}

setDateToToday();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.classList.add("hidden");
  successEl.classList.add("hidden");

  const data = new FormData(form);
  const amount = parseFloat(data.get("amount"), 10);

  if (!Number.isFinite(amount) || amount <= 0) {
    errorEl.textContent = "Enter a valid amount greater than zero.";
    errorEl.classList.remove("hidden");
    return;
  }

  try {
    await addExpense(user.uid, {
      amount,
      currency: data.get("currency") || "INR",
      category: data.get("category") || "Other",
      note: data.get("note") || "",
      spentAt: new Date(data.get("spentAt")),
    });
    successEl.textContent = "Expense saved.";
    successEl.classList.remove("hidden");
    form.reset();
    setDateToToday();
  } catch (err) {
    if (!navigator.onLine) {
      errorEl.textContent = "You are offline. Connect to save expenses.";
    } else {
      errorEl.textContent = err.message || "Could not save expense.";
    }
    errorEl.classList.remove("hidden");
  }
});
