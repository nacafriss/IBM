/* ============================================
   Pocketly – edit-transaction.js
   Logic for the Edit Transaction page.
   Pre-fills the form from ?id=... URL param,
   validates, and saves changes.
   ============================================ */

'use strict';

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();

  // Determine the transaction ID from the URL query string
  const params = new URLSearchParams(window.location.search);
  const txId   = params.get('id');

  if (!txId) {
    showNotFound();
    return;
  }

  const tx = getTransactionById(txId);
  if (!tx) {
    showNotFound();
    return;
  }

  // Pre-fill the form
  prefillForm(tx);

  // Wire up cancel button – go back to the page that opened edit, or dashboard
  document.getElementById('btnBack').addEventListener('click', goBack);
  document.getElementById('btnCancel').addEventListener('click', goBack);

  // Update categories when type changes
  document.querySelectorAll('input[name="txType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      populateCategories(radio.value);
    });
  });

  // Form submit
  document.getElementById('editForm').addEventListener('submit', (e) => {
    e.preventDefault();
    handleSave(txId);
  });
});

// ─────────────────────────────────────────────
// FORM FILL
// ─────────────────────────────────────────────

/**
 * Pre-fill every form field from an existing transaction object.
 * @param {{ id:string, name:string, amount:number, type:string, category:string, date:string, description:string }} tx
 */
function prefillForm(tx) {
  document.getElementById('txId').value     = tx.id;
  document.getElementById('txName').value   = tx.name;
  document.getElementById('txAmount').value = tx.amount;
  document.getElementById('txDate').value   = tx.date;
  document.getElementById('txDesc').value   = tx.description || '';

  // Set radio type
  const radio = document.querySelector(`input[name="txType"][value="${tx.type}"]`);
  if (radio) radio.checked = true;

  // Populate and pre-select category
  populateCategories(tx.type, tx.category);
}

/**
 * Populate the category <select> based on type.
 * @param {string} type
 * @param {string} [selected]
 */
function populateCategories(type, selected = '') {
  const select = document.getElementById('txCategory');
  const cats   = CATEGORIES[type] || CATEGORIES.expense;
  select.innerHTML = cats
    .map(c => `<option value="${c}"${c === selected ? ' selected' : ''}>${c}</option>`)
    .join('');
}

// ─────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────

function validate() {
  let ok = true;

  const name   = document.getElementById('txName').value.trim();
  const amount = parseFloat(document.getElementById('txAmount').value);

  // Reset error states
  ['txName', 'txAmount'].forEach(id => document.getElementById(id).classList.remove('is-error'));
  ['txNameError', 'txAmountError'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });

  if (!name) {
    document.getElementById('txName').classList.add('is-error');
    document.getElementById('txNameError').classList.remove('hidden');
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
// SAVE
// ─────────────────────────────────────────────

/**
 * Validate the form and update the transaction in storage.
 * @param {string} id
 */
function handleSave(id) {
  if (!validate()) return;

  const type = document.querySelector('input[name="txType"]:checked')?.value || 'expense';

  const data = {
    name:        document.getElementById('txName').value.trim(),
    type,
    amount:      parseFloat(document.getElementById('txAmount').value),
    category:    document.getElementById('txCategory').value,
    date:        document.getElementById('txDate').value || todayISO(),
    description: document.getElementById('txDesc').value.trim(),
  };

  const success = updateTransaction(id, data);

  if (success) {
    showToast('Changes saved successfully!');
    setTimeout(() => { window.location.href = 'index.html'; }, 900);
  } else {
    showToast('Failed to save changes.', 'error');
  }
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────

function showNotFound() {
  document.getElementById('formCard').classList.add('hidden');
  document.getElementById('notFound').classList.remove('hidden');
}

function goBack() {
  // Use browser history if available, otherwise go to dashboard
  if (document.referrer && document.referrer !== window.location.href) {
    history.back();
  } else {
    window.location.href = 'index.html';
  }
}
