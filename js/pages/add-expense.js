import { requireAuth } from "../auth-guard.js";
import { usernameFromUser } from "../auth.js";
import {
  addExpense,
  parseDateInputValue,
  getKnownCategories,
  resolveCategoryName,
  DEFAULT_CATEGORIES,
} from "../expenses.js";

const form = document.getElementById("expense-form");
const errorEl = document.getElementById("form-error");
const successEl = document.getElementById("form-success");
const dateInput = document.getElementById("spent-at");
const categoryInput = document.getElementById("category-input");
const categoryList = document.getElementById("category-list");
const saveBtn = form?.querySelector('button[type="submit"]');

let knownCategories = [...DEFAULT_CATEGORIES];

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
  const resolved = resolveCategoryName(categoryInput.value, knownCategories);
  categoryInput.value = resolved;
  rememberCategory(resolved);
  hideCategoryList();
}

function hideCategoryList() {
  categoryList?.classList.add("hidden");
}

function showCategoryList() {
  if (!categoryList || !categoryInput) return;
  const query = categoryInput.value.trim().toLowerCase();
  const matches = knownCategories.filter((name) =>
    name.toLowerCase().includes(query)
  );
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
categoryInput?.addEventListener("input", showCategoryList);
categoryInput?.addEventListener("blur", () => {
  finishCategory();
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

    const category = resolveCategoryName(data.get("category"), knownCategories);
    if (!category) {
      showError("Enter a category.");
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
        saveBtn.textContent = "Save expense";
      }
    }
});

user = await requireAuth();
if (user) {
  try {
    knownCategories = await getKnownCategories();
  } catch (err) {
    console.error("Could not load categories:", err);
  }
}
