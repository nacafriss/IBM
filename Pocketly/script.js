/* ============================================
   Pocketly – script.js
   Dashboard page logic.
   ============================================ */

'use strict';

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();           // inject shared navbar
  renderDateLabel();        // show current date
  renderSummary();          // balance / income / expense totals
  renderMonthlyOverview();  // current month progress bars
  renderRecentTransactions(); // last 5 transactions

  // Init delete modal – deletes and re-renders
  window._openDeleteModal = initDeleteModal((id) => {
    deleteTransaction(id);
    showToast('Transaction deleted.');
    renderSummary();
    renderMonthlyOverview();
    renderRecentTransactions();
  });

});

// ─────────────────────────────────────────────
// DATE LABEL
// ─────────────────────────────────────────────

function renderDateLabel() {
  const el = document.getElementById('dateLabel');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ─────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────

function renderSummary() {
  const txs = getAllTransactions();

  const totalIncome   = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance       = totalIncome - totalExpenses;

  const balanceEl = document.getElementById('totalBalance');
  balanceEl.textContent = formatRupiah(balance);
  balanceEl.style.color = balance < 0 ? '#f87171' : '';

  document.getElementById('totalIncome').textContent   = formatRupiah(totalIncome);
  document.getElementById('totalExpenses').textContent = formatRupiah(totalExpenses);
}

// ─────────────────────────────────────────────
// MONTHLY OVERVIEW
// ─────────────────────────────────────────────

function renderMonthlyOverview() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth(); // 0-based

  const txs = getAllTransactions().filter(tx => {
    const d = new Date(tx.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const income   = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net      = income - expenses;
  const max      = Math.max(income, expenses, 1);

  document.getElementById('currentMonthLabel').textContent =
    now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  document.getElementById('monthIncome').textContent   = formatRupiah(income);
  document.getElementById('monthExpenses').textContent = formatRupiah(expenses);

  const netEl = document.getElementById('monthNet');
  netEl.textContent  = (net >= 0 ? '+' : '-') + formatRupiah(net);
  netEl.style.color  = net >= 0 ? 'var(--income)' : 'var(--expense)';

  // Animate bars after paint
  requestAnimationFrame(() => {
    document.getElementById('monthIncomeBar').style.width   = (income / max * 100) + '%';
    document.getElementById('monthExpensesBar').style.width = (expenses / max * 100) + '%';
  });
}

// ─────────────────────────────────────────────
// RECENT TRANSACTIONS
// ─────────────────────────────────────────────

function renderRecentTransactions() {
  const list = document.getElementById('recentList');
  const empty = document.getElementById('emptyState');
  const txs = getAllTransactions();

  if (txs.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  // Show newest 5
  const recent = [...txs]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  list.innerHTML = recent.map(tx => buildTransactionItem(tx)).join('');

  // Wire up edit / delete buttons
  list.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = 'edit-transaction.html?id=' + btn.dataset.id;
    });
  });
  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => window._openDeleteModal(btn.dataset.id));
  });
}

// ─────────────────────────────────────────────
// TRANSACTION ITEM BUILDER (shared HTML)
// ─────────────────────────────────────────────

/**
 * Build an HTML string for a single transaction row.
 * @param {{ id:string, name:string, amount:number, type:string, category:string, date:string }} tx
 * @returns {string}
 */
function buildTransactionItem(tx) {
  const icon   = CATEGORY_ICONS[tx.category] || '📦';
  const sign   = tx.type === 'income' ? '+' : '−';
  const amount = sign + formatRupiah(tx.amount);

  return `
    <div class="transaction-item">
      <div class="tx-icon ${tx.type}">${icon}</div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-gray-800 truncate">${escapeHtml(tx.name)}</p>
        <div class="flex items-center gap-2 mt-0.5 flex-wrap">
          <span class="category-badge">${escapeHtml(tx.category)}</span>
          <span class="text-xs text-gray-400">${formatDate(tx.date)}</span>
        </div>
      </div>
      <span class="tx-amount ${tx.type}">${amount}</span>
      <div class="flex gap-1">
        <button class="btn-edit" data-id="${tx.id}" title="Edit" aria-label="Edit ${escapeHtml(tx.name)}">
          <svg class="w-4 h-4" style="color:var(--sage)" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <button class="btn-delete" data-id="${tx.id}" title="Delete" aria-label="Delete ${escapeHtml(tx.name)}">
          <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>`;
}
