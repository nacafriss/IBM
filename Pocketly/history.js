/* ============================================
   Pocketly – history.js
   Transaction History page logic.
   • Month navigation
   • Type & category filter + live search
   • Grouped transaction list
   • Bar chart: Income vs Expense (6 months)
   • Doughnut chart: Expense by category
   ============================================ */

'use strict';

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────

/** Currently viewed month (0-based) and year */
const state = {
  year:   new Date().getFullYear(),
  month:  new Date().getMonth(),
  filter: 'all',    // 'all' | 'income' | 'expense'
  category: '',     // '' = all categories
  search:   '',
};

/** Chart.js instances (kept for destroy-before-redraw) */
let barChartInstance      = null;
let doughnutChartInstance = null;

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
  populateCategoryFilter();
  bindEvents();
  render();       // first paint
  renderCharts(); // initial charts
});

// ─────────────────────────────────────────────
// EVENT BINDING
// ─────────────────────────────────────────────

function bindEvents() {
  // Month navigation
  document.getElementById('prevMonth').addEventListener('click', () => {
    state.month--;
    if (state.month < 0) { state.month = 11; state.year--; }
    render();
    updateDoughnutChart();
  });
  document.getElementById('nextMonth').addEventListener('click', () => {
    state.month++;
    if (state.month > 11) { state.month = 0; state.year++; }
    render();
    updateDoughnutChart();
  });

  // Type filter tabs
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filter = btn.dataset.filter;
      render();
    });
  });

  // Category filter
  document.getElementById('categoryFilter').addEventListener('change', e => {
    state.category = e.target.value;
    render();
  });

  // Search
  document.getElementById('searchInput').addEventListener('input', e => {
    state.search = e.target.value.toLowerCase().trim();
    render();
  });

  // Delete modal
  window._openDeleteModal = initDeleteModal(id => {
    deleteTransaction(id);
    showToast('Transaction deleted.');
    render();
    renderCharts();
  });
}

// ─────────────────────────────────────────────
// CATEGORY FILTER POPULATE
// ─────────────────────────────────────────────

function populateCategoryFilter() {
  const all  = [...CATEGORIES.income, ...CATEGORIES.expense];
  const unique = [...new Set(all)];
  const select = document.getElementById('categoryFilter');
  unique.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
}

// ─────────────────────────────────────────────
// MAIN RENDER
// ─────────────────────────────────────────────

function render() {
  updateMonthLabel();
  const txs = getFilteredTransactions();
  renderMonthStats(txs);
  renderList(txs);
}

/** Update the month/year label in the navigator. */
function updateMonthLabel() {
  const d = new Date(state.year, state.month, 1);
  document.getElementById('monthLabel').textContent =
    d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

// ─────────────────────────────────────────────
// FILTERING
// ─────────────────────────────────────────────

/**
 * Return transactions for the current month, applying all active filters.
 * @returns {Array}
 */
function getFilteredTransactions() {
  return getAllTransactions().filter(tx => {
    const d = new Date(tx.date + 'T00:00:00');

    const inMonth    = d.getFullYear() === state.year && d.getMonth() === state.month;
    const typeMatch  = state.filter === 'all' || tx.type === state.filter;
    const catMatch   = !state.category || tx.category === state.category;
    const search     = !state.search ||
      tx.name.toLowerCase().includes(state.search) ||
      tx.category.toLowerCase().includes(state.search);

    return inMonth && typeMatch && catMatch && search;
  });
}

// ─────────────────────────────────────────────
// MONTHLY STATS
// ─────────────────────────────────────────────

function renderMonthStats(txs) {
  // Always calculate stats on unfiltered month data
  const monthTxs = getAllTransactions().filter(tx => {
    const d = new Date(tx.date + 'T00:00:00');
    return d.getFullYear() === state.year && d.getMonth() === state.month;
  });

  const income   = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net      = income - expenses;

  document.getElementById('monthStatIncome').textContent   = formatRupiah(income);
  document.getElementById('monthStatExpenses').textContent = formatRupiah(expenses);
  const netEl = document.getElementById('monthStatNet');
  netEl.textContent = (net >= 0 ? '+' : '−') + formatRupiah(net);
  netEl.style.color = net >= 0 ? 'var(--income)' : 'var(--expense)';
}

// ─────────────────────────────────────────────
// LIST RENDERING
// ─────────────────────────────────────────────

function renderList(txs) {
  const container = document.getElementById('historyList');
  const empty     = document.getElementById('emptyState');

  if (txs.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  // Sort newest first
  const sorted = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = sorted.map(tx => buildTransactionItem(tx)).join('');

  // Wire edit / delete buttons
  container.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = 'edit-transaction.html?id=' + btn.dataset.id;
    });
  });
  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => window._openDeleteModal(btn.dataset.id));
  });
}

/**
 * Build HTML for one transaction row (same design as dashboard).
 * @param {object} tx
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
          ${tx.description ? `<span class="text-xs text-gray-400 truncate max-w-xs">${escapeHtml(tx.description)}</span>` : ''}
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

// ─────────────────────────────────────────────
// CHART HELPERS
// ─────────────────────────────────────────────

/**
 * Generate an array of { year, month } objects for the last N months
 * ending at (and including) the current calendar month.
 * @param {number} n
 * @returns {{ year:number, month:number, label:string }[]}
 */
function lastNMonths(n) {
  const result = [];
  const now    = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      year:  d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    });
  }
  return result;
}

/**
 * Sum all transactions in a given month/year by type.
 * @param {Array} txs
 * @param {number} year
 * @param {number} month
 * @returns {{ income: number, expense: number }}
 */
function monthTotals(txs, year, month) {
  const subset = txs.filter(tx => {
    const d = new Date(tx.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });
  return {
    income:  subset.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    expense: subset.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
  };
}

// ─────────────────────────────────────────────
// BAR CHART – Income vs Expense (6 months)
// ─────────────────────────────────────────────

function renderBarChart() {
  const txs    = getAllTransactions();
  const months = lastNMonths(6);

  const incomeData  = months.map(m => monthTotals(txs, m.year, m.month).income);
  const expenseData = months.map(m => monthTotals(txs, m.year, m.month).expense);
  const labels      = months.map(m => m.label);

  const ctx = document.getElementById('barChart').getContext('2d');

  if (barChartInstance) barChartInstance.destroy();

  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label:           'Income',
          data:            incomeData,
          backgroundColor: 'rgba(74,124,89,0.75)',
          borderColor:     '#4A7C59',
          borderWidth:     1,
          borderRadius:    4,
        },
        {
          label:           'Expenses',
          data:            expenseData,
          backgroundColor: 'rgba(192,57,43,0.70)',
          borderColor:     '#C0392B',
          borderWidth:     1,
          borderRadius:    4,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: ctx => ' ' + formatRupiah(ctx.parsed.y),
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: {
          grid: { color: '#f3f4f6' },
          ticks: {
            font: { size: 10 },
            callback: v => {
              if (v >= 1000000) return 'Rp' + (v / 1000000).toFixed(1) + 'M';
              if (v >= 1000)    return 'Rp' + (v / 1000).toFixed(0) + 'K';
              return 'Rp' + v;
            },
          },
        },
      },
    },
  });
}

// ─────────────────────────────────────────────
// DOUGHNUT CHART – Expense by category
// ─────────────────────────────────────────────

const CHART_COLORS = [
  '#4A7C59', '#6B9E7B', '#2F5540', '#9ECFB0',
  '#C0392B', '#E74C3C', '#F1948A', '#922B21',
];

function updateDoughnutChart() {
  const txs = getAllTransactions().filter(tx => {
    const d = new Date(tx.date + 'T00:00:00');
    return tx.type === 'expense' &&
      d.getFullYear() === state.year && d.getMonth() === state.month;
  });

  // Group by category
  const grouped = {};
  txs.forEach(tx => {
    grouped[tx.category] = (grouped[tx.category] || 0) + tx.amount;
  });

  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  const labels  = entries.map(e => e[0]);
  const data    = entries.map(e => e[1]);
  const colors  = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  // Update month label
  const d = new Date(state.year, state.month, 1);
  document.getElementById('doughnutMonthLabel').textContent =
    d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const ctx = document.getElementById('doughnutChart').getContext('2d');

  if (doughnutChartInstance) doughnutChartInstance.destroy();

  if (data.length === 0) {
    // No expenses – show placeholder
    document.getElementById('doughnutLegend').innerHTML =
      '<p class="text-xs text-gray-400 col-span-2 text-center">No expense data for this period.</p>';
    doughnutChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: { labels: ['No data'], datasets: [{ data: [1], backgroundColor: ['#e5e7eb'] }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        cutout: '65%',
      },
    });
    return;
  }

  const total = data.reduce((s, v) => s + v, 0);

  doughnutChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor:      colors,
        borderColor:          '#fff',
        borderWidth:          2,
        hoverOffset:          6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return ` ${ctx.label}: ${formatRupiah(ctx.parsed)} (${pct}%)`;
            },
          },
        },
      },
    },
  });

  // Custom legend
  document.getElementById('doughnutLegend').innerHTML = entries.map((e, i) => {
    const pct = ((e[1] / total) * 100).toFixed(1);
    return `
      <div class="flex items-center gap-1.5 text-xs">
        <span class="w-2.5 h-2.5 rounded-sm flex-shrink-0" style="background:${colors[i]}"></span>
        <span class="text-gray-600 truncate">${escapeHtml(e[0])}</span>
        <span class="ml-auto text-gray-400 font-medium">${pct}%</span>
      </div>`;
  }).join('');
}

/** Render both charts (called on load and after data changes). */
function renderCharts() {
  renderBarChart();
  updateDoughnutChart();
}
