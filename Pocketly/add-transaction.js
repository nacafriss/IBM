/* ============================================
   Pocketly – add-transaction.js
   Logic for the Add Transaction page.
   ============================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();

  // Set today as default date
  document.getElementById('txDate').value = todayISO();

  // Default type = expense
  setRadio('expense');
  populateCategories('expense');

  // Update categories when type changes
  document.querySelectorAll('input[name="txType"]').forEach(radio => {
    radio.addEventListener('change', () => populateCategories(radio.value));
  });

  // Form submit
  document.getElementById('addForm').addEventListener('submit', handleSubmit);
});

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Set a radio button by value. */
function setRadio(value) {
  const radio = document.querySelector(`input[name="txType"][value="${value}"]`);
  if (radio) radio.checked = true;
}

/** Populate category <select> based on transaction type. */
function populateCategories(type, selected = '') {
  const select = document.getElementById('txCategory');
  const cats   = CATEGORIES[type] || CATEGORIES.expense;
  select.innerHTML = cats
    .map(c => `<option value="${c}"${c === selected ? ' selected' : ''}>${c}</option>`)
    .join('');
}

/** Return currently selected radio value. */
function getSelectedType() {
  const r = document.querySelector('input[name="txType"]:checked');
  return r ? r.value : '';
}

// ─────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────

function validate() {
  let ok = true;

  const name   = document.getElementById('txName').value.trim();
  const amount = parseFloat(document.getElementById('txAmount').value);
  const type   = getSelectedType();

  // Reset
  ['txName', 'txAmount'].forEach(id => document.getElementById(id).classList.remove('is-error'));
  ['txNameError', 'txAmountError', 'txTypeError'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });

  if (!name) {
    document.getElementById('txName').classList.add('is-error');
    document.getElementById('txNameError').classList.remove('hidden');
    ok = false;
  }
  if (!type) {
    document.getElementById('txTypeError').classList.remove('hidden');
    ok = false;
  }
  if (!amount || amount <= 0 || isNaN(amount)) {
    document.getElementById('txAmount').classList.add('is-error');
    document.getElementById('txAmountError').classList.remove('hidden');
    ok = false;
  }
  return ok;
}

// ─────────────────────────────────────────────
// SUBMIT
// ─────────────────────────────────────────────

function handleSubmit(e) {
  e.preventDefault();
  if (!validate()) return;

  const data = {
    name:        document.getElementById('txName').value.trim(),
    type:        getSelectedType(),
    amount:      parseFloat(document.getElementById('txAmount').value),
    category:    document.getElementById('txCategory').value,
    date:        document.getElementById('txDate').value || todayISO(),
    description: document.getElementById('txDesc').value.trim(),
  };

  addTransaction(data);
  showToast('Transaction saved successfully!');

  // Redirect to dashboard after short delay so toast is visible
  setTimeout(() => { window.location.href = 'index.html'; }, 900);
}
