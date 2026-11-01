/* ============================================
   Pocketly – storage.js
   Centralised Local Storage data layer.
   Every page imports from this file so all
   reads / writes hit the same key.
   ============================================ */

'use strict';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const STORAGE_KEY = 'pocketly_transactions';

/** Categories per transaction type */
const CATEGORIES = {
  income: ['Salary', 'Freelance', 'Investment', 'Gift', 'Others'],
  expense: [
    'Food & Drinks',
    'Transportation',
    'Shopping',
    'Education',
    'Entertainment',
    'Health',
    'Bills & Utilities',
    'Others',
  ],
};

/** Emoji icon per category */
const CATEGORY_ICONS = {
  'Salary':            '💼',
  'Freelance':         '💻',
  'Investment':        '📈',
  'Gift':              '🎁',
  'Food & Drinks':     '🍜',
  'Transportation':    '🚗',
  'Shopping':          '🛍️',
  'Education':         '📚',
  'Entertainment':     '🎬',
  'Health':            '❤️',
  'Bills & Utilities': '💡',
  'Others':            '📦',
};

/** Seed data – loaded once when localStorage is empty */
const SAMPLE_TRANSACTIONS = [
  { id: 'sample-1',  name: 'Monthly Salary',          amount: 8500000, type: 'income',  category: 'Salary',          date: '2026-11-01', description: '' },
  { id: 'sample-2',  name: 'Grocery Shopping',         amount:  350000, type: 'expense', category: 'Food & Drinks',   date: '2026-11-01', description: 'Weekly groceries' },
  { id: 'sample-3',  name: 'Netflix Subscription',     amount:  186000, type: 'expense', category: 'Entertainment',   date: '2026-11-02', description: '' },
  { id: 'sample-4',  name: 'Freelance Web Project',    amount: 2500000, type: 'income',  category: 'Freelance',       date: '2026-11-03', description: 'Landing page for client' },
  { id: 'sample-5',  name: 'Ojek Online (commute)',    amount:   45000, type: 'expense', category: 'Transportation',  date: '2026-11-04', description: '' },
  { id: 'sample-6',  name: 'Online Course – UI Design',amount:  299000, type: 'expense', category: 'Education',       date: '2026-11-05', description: 'Udemy course' },
  { id: 'sample-7',  name: 'October Salary',           amount: 8500000, type: 'income',  category: 'Salary',          date: '2026-10-01', description: '' },
  { id: 'sample-8',  name: 'Dinner with family',       amount:  420000, type: 'expense', category: 'Food & Drinks',   date: '2026-10-05', description: '' },
  { id: 'sample-9',  name: 'Electric bill',            amount:  275000, type: 'expense', category: 'Bills & Utilities',date: '2026-10-10', description: '' },
  { id: 'sample-10', name: 'Stock dividend',           amount:  350000, type: 'income',  category: 'Investment',      date: '2026-10-15', description: '' },
  { id: 'sample-11', name: 'Gym membership',           amount:  299000, type: 'expense', category: 'Health',          date: '2026-10-18', description: '' },
  { id: 'sample-12', name: 'September Salary',         amount: 8500000, type: 'income',  category: 'Salary',          date: '2026-09-01', description: '' },
  { id: 'sample-13', name: 'New laptop bag',           amount:  650000, type: 'expense', category: 'Shopping',        date: '2026-09-12', description: '' },
  { id: 'sample-14', name: 'Freelance logo design',    amount:  750000, type: 'income',  category: 'Freelance',       date: '2026-09-20', description: '' },
  { id: 'sample-15', name: 'Transportation card top-up',amount: 200000, type: 'expense', category: 'Transportation',  date: '2026-09-22', description: '' },
];

// ─────────────────────────────────────────────
// CORE CRUD
// ─────────────────────────────────────────────

/**
 * Load all transactions from localStorage.
 * Seeds with sample data on first run.
 * @returns {{ id: string, name: string, amount: number, type: string, category: string, date: string, description: string }[]}
 */
function getAllTransactions() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return _seed();
    }
  }
  return _seed();
}

/** Write to localStorage and return the saved array. */
function _save(transactions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  return transactions;
}

/** Seed localStorage with sample data and return it. */
function _seed() {
  return _save([...SAMPLE_TRANSACTIONS]);
}

/**
 * Add a new transaction.
 * @param {{ name: string, amount: number, type: string, category: string, date: string, description: string }} data
 * @returns {{ id: string, name: string, amount: number, type: string, category: string, date: string, description: string }}
 */
function addTransaction(data) {
  const transactions = getAllTransactions();
  const newTx = { id: _generateId(), ...data };
  transactions.unshift(newTx);
  _save(transactions);
  return newTx;
}

/**
 * Update an existing transaction by ID.
 * @param {string} id
 * @param {{ name: string, amount: number, type: string, category: string, date: string, description: string }} data
 * @returns {boolean} true if found and updated
 */
function updateTransaction(id, data) {
  const transactions = getAllTransactions();
  const idx = transactions.findIndex(tx => tx.id === id);
  if (idx === -1) return false;
  transactions[idx] = { id, ...data };
  _save(transactions);
  return true;
}

/**
 * Delete a transaction by ID.
 * @param {string} id
 * @returns {boolean} true if found and deleted
 */
function deleteTransaction(id) {
  const transactions = getAllTransactions();
  const filtered = transactions.filter(tx => tx.id !== id);
  if (filtered.length === transactions.length) return false;
  _save(filtered);
  return true;
}

/**
 * Get a single transaction by ID.
 * @param {string} id
 * @returns {{ id: string, name: string, amount: number, type: string, category: string, date: string, description: string } | null}
 */
function getTransactionById(id) {
  return getAllTransactions().find(tx => tx.id === id) || null;
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────

/**
 * Format a number as IDR Rupiah.
 * @param {number} value
 * @returns {string}  e.g. "Rp1.500.000"
 */
function formatRupiah(value) {
  return 'Rp' + Math.abs(value).toLocaleString('id-ID');
}

/**
 * Format ISO date string to human-readable.
 * @param {string} dateStr "YYYY-MM-DD"
 * @returns {string} e.g. "1 Nov 2026"
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** @returns {string} Today as YYYY-MM-DD */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Escape HTML entities to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Generate a unique transaction ID. */
function _generateId() {
  return 'tx-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}
