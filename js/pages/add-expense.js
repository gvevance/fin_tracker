import { requireAuth } from "../auth-guard.js";
import { usernameFromUser, isAdminUser, appPageHref, takeEditExpenseId } from "../auth.js";
import {
  addExpense,
  updateExpense,
  getExpense,
  parseDateInputValue,
  formatDateInputValue,
  toExpenseDate,
  getKnownCategories,
  backfillCategoriesFromExpenses,
  resolveCategoryName,
  DEFAULT_CATEGORIES,
} from "../expenses.js";

const form = document.getElementById("expense-form");
const errorEl = document.getElementById("form-error");
const successEl = document.getElementById("form-success");
const dateInput = document.getElementById("spent-at");
const categoryInput = document.getElementById("category-input");
const categoryList = document.getElementById("category-list");
const pageLoading = document.getElementById("page-loading");
const pageLoadError = document.getElementById("page-load-error");
const saveBtn = form?.querySelector('button[type="submit"]');
const pageTitle = document.querySelector(".top-bar__title");
const backLink = document.querySelector(".top-bar__back");

let knownCategories = [...DEFAULT_CATEGORIES];
const editingId = takeEditExpenseId();

function monthlyHref() {
  return appPageHref("monthly-expenses.html");
}

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

function rememberCategory(name) {
  if (!knownCategories.some((item) => item.toLowerCase() === name.toLowerCase())) {
    knownCategories.push(name);
    knownCategories.sort((a, b) => a.localeCompare(b));
  }
}

function finishCategory() {
  if (!categoryInput) return;
  const typed = categoryInput.value.trim();
  if (!typed) {
    hideCategoryList();
    return;
  }
  const resolved = resolveCategoryName(typed, knownCategories);
  categoryInput.value = resolved;
  rememberCategory(resolved);
  hideCategoryList();
}

function hideCategoryList() {
  categoryList?.classList.add("hidden");
}

function showCategoryList() {
  if (!categoryList || !categoryInput) return;
  const typed = categoryInput.value.trim();
  const exactMatch = knownCategories.some(
    (name) => name.toLowerCase() === typed.toLowerCase()
  );
  const query = !typed || exactMatch ? "" : typed.toLowerCase();
  const matches = query
    ? knownCategories.filter((name) => name.toLowerCase().includes(query))
    : knownCategories;
  categoryList.innerHTML = "";
  for (const name of matches) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "combobox__option";
    button.textContent = name;
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      categoryInput.value = name;
      finishCategory();
    });
    item.appendChild(button);
    categoryList.appendChild(item);
  }
  categoryList.classList.toggle("hidden", matches.length === 0);
}

categoryInput?.addEventListener("focus", showCategoryList);
categoryInput?.addEventListener("click", showCategoryList);
categoryInput?.addEventListener("input", showCategoryList);
categoryInput?.addEventListener("blur", () => {
  window.setTimeout(() => {
    if (document.activeElement === categoryInput) return;
    finishCategory();
  }, 250);
});
categoryInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    finishCategory();
  }
});

setDateToToday();

let user = null;
let saving = false;

form?.addEventListener("submit", async (e) => {
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

    const category = resolveCategoryName(data.get("category"), knownCategories);
    if (!category) {
      showError("Enter a category.");
      return;
    }

    saving = true;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.classList.add("is-busy");
      saveBtn.textContent = "Saving…";
    }

    try {
      if (editingId) {
        await updateExpense(editingId, {
          amount,
          currency: "INR",
          category,
          note: data.get("note") || "",
          spentAt,
        });
        window.location.assign(monthlyHref());
        return;
      }

      await addExpense(user.uid, {
        amount,
        currency: "INR",
        category,
        note: data.get("note") || "",
        spentAt,
        addedBy: usernameFromUser(user),
      });
      rememberCategory(category);
      showSuccess("Expense saved.");
      form.reset();
      setDateToToday();
      if (categoryInput) categoryInput.value = "";
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
        saveBtn.classList.remove("is-busy");
        saveBtn.textContent = editingId ? "Save changes" : "Save expense";
      }
    }
});

function revealForm() {
  pageLoading?.classList.add("hidden");
  pageLoadError?.classList.add("hidden");
  form?.classList.remove("hidden");
  form?.classList.add("is-ready");
}

function showLoadError(message) {
  pageLoading?.classList.add("hidden");
  form?.classList.add("hidden");
  if (pageLoadError) {
    pageLoadError.textContent = message;
    pageLoadError.classList.remove("hidden");
  }
}

function mergeCategories(extra) {
  for (const name of extra) {
    rememberCategory(name);
  }
}

function fillExpenseForm(expense) {
  const amountInput = form?.querySelector('[name="amount"]');
  const noteInput = form?.querySelector('[name="note"]');
  if (amountInput) amountInput.value = expense.amount ?? "";
  if (categoryInput) categoryInput.value = expense.category || "";
  const date = toExpenseDate(expense.spentAt);
  if (dateInput && date) dateInput.value = formatDateInputValue(date);
  if (noteInput) noteInput.value = expense.note || "";
}

function setupEditMode() {
  document.title = "Edit expense — Financial Tracker";
  if (pageTitle) pageTitle.textContent = "Edit expense";
  if (backLink) {
    backLink.href = "monthly-expenses.html";
    backLink.textContent = "← Monthly";
  }
  if (saveBtn) saveBtn.textContent = "Save changes";
}

try {
  user = await requireAuth();
  if (user) {
    if (editingId && !isAdminUser(user)) {
      showLoadError("Only admin can modify expenses.");
    } else {
      try {
        knownCategories = await Promise.race([
          getKnownCategories(),
          new Promise((_, reject) => {
            window.setTimeout(() => reject(new Error("timeout")), 2500);
          }),
        ]);
      } catch (err) {
        console.error("Category list load was slow or failed:", err);
        knownCategories = [...DEFAULT_CATEGORIES];
      }
      if (!knownCategories.length) {
        knownCategories = [...DEFAULT_CATEGORIES];
      }

      if (editingId) {
        setupEditMode();
        const expense = await getExpense(editingId);
        fillExpenseForm(expense);
        rememberCategory(expense.category || "");
      }

      revealForm();

      backfillCategoriesFromExpenses()
        .then((found) => {
          mergeCategories(found);
        })
        .catch((err) => {
          console.error("Could not backfill categories:", err);
        });
    }
  }
} catch (err) {
  console.error(err);
  if (!navigator.onLine) {
    showLoadError("You are offline. Connect and try again.");
  } else {
    showLoadError(err.message || "Could not load Add expense. Try again.");
  }
}
