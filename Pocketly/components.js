/* ============================================
   Pocketly – components.js
   Shared UI components injected into every page.
   ============================================ */

'use strict';

// ─────────────────────────────────────────────
// NAVIGATION BAR
// ─────────────────────────────────────────────

/**
 * Inject the shared top navigation bar into the element with id="navbar".
 * Highlights the active link based on the current page filename.
 */
function renderNavbar() {
  const navEl = document.getElementById('navbar');
  if (!navEl) return;

  const page = window.location.pathname.split('/').pop() || 'index.html';

  const links = [
    { href: 'index.html',           label: 'Dashboard',   icon: dashboardIcon() },
    { href: 'history.html',         label: 'History',     icon: historyIcon()   },
    { href: 'add-transaction.html', label: 'Add',         icon: addIcon()       },
  ];

  const navLinks = links.map(link => {
    const isActive = page === link.href;
    return `
      <a href="${link.href}"
        class="nav-link ${isActive ? 'nav-link--active' : ''}"
        aria-current="${isActive ? 'page' : 'false'}">
        ${link.icon}
        <span>${link.label}</span>
      </a>`;
  }).join('');

  navEl.innerHTML = `
    <div class="navbar-inner">
      <!-- Brand -->
      <a href="index.html" class="navbar-brand" aria-label="Pocketly Home">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
        </svg>
        <span>Pocketly</span>
      </a>
      <!-- Desktop nav links -->
      <nav class="navbar-links" aria-label="Main navigation">
        ${navLinks}
      </nav>
      <!-- Mobile hamburger -->
      <button id="navToggle" class="navbar-toggle" aria-label="Toggle menu" aria-expanded="false">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
    </div>
    <!-- Mobile dropdown menu -->
    <nav id="mobileMenu" class="mobile-menu hidden" aria-label="Mobile navigation">
      ${navLinks}
    </nav>
  `;

  // Toggle mobile menu
  const toggle = document.getElementById('navToggle');
  const menu   = document.getElementById('mobileMenu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = !menu.classList.contains('hidden');
      menu.classList.toggle('hidden', open);
      toggle.setAttribute('aria-expanded', String(!open));
    });
  }
}

// ─────────────────────────────────────────────
// DELETE CONFIRMATION MODAL
// ─────────────────────────────────────────────

/**
 * Inject and manage a shared delete-confirmation modal.
 * Call this once per page. Returns a function to open the modal.
 *
 * @param {(id: string) => void} onConfirm – called with the transaction ID on confirm
 * @returns {(id: string) => void} openDeleteModal(id)
 */
function initDeleteModal(onConfirm) {
  // Create modal element
  const modal = document.createElement('div');
  modal.id = 'deleteModal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'deleteModalTitle');
  modal.className = 'modal-overlay hidden';
  modal.innerHTML = `
    <div class="modal-box">
      <h3 id="deleteModalTitle" class="text-base font-bold text-gray-800 mb-1">Delete Transaction?</h3>
      <p class="text-sm text-gray-500 mb-5">This action cannot be undone. The transaction will be permanently removed.</p>
      <div class="flex gap-3">
        <button id="deleteCancelBtn" class="btn btn--outline flex-1">Cancel</button>
        <button id="deleteConfirmBtn" class="btn btn--danger flex-1">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  let pendingId = null;

  const closeModal = () => {
    modal.classList.add('hidden');
    pendingId = null;
    document.body.style.overflow = '';
  };

  document.getElementById('deleteCancelBtn').addEventListener('click', closeModal);
  document.getElementById('deleteConfirmBtn').addEventListener('click', () => {
    if (pendingId) {
      onConfirm(pendingId);
    }
    closeModal();
  });
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  return function openDeleteModal(id) {
    pendingId = id;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  };
}

// ─────────────────────────────────────────────
// TOAST NOTIFICATION
// ─────────────────────────────────────────────

/**
 * Show a brief toast notification.
 * @param {string} message
 * @param {'success'|'error'} [type='success']
 */
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  // Remove after 3 s
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3000);
}

// ─────────────────────────────────────────────
// SVG ICON HELPERS
// ─────────────────────────────────────────────

function dashboardIcon() {
  return `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round"
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
  </svg>`;
}

function historyIcon() {
  return `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round"
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
  </svg>`;
}

function addIcon() {
  return `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
  </svg>`;
}
