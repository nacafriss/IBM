/* ============================================
   Pocketly – chat.js
   AI Financial Assistant powered by watsonx.ai
   ============================================ */

'use strict';

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

/**
 * IBM watsonx.ai inference endpoint.
 * Uses the Llama 3 instruct model via the generate API.
 * Replace IAM_TOKEN and PROJECT_ID with your credentials,
 * or wire up a lightweight proxy so the token stays server-side.
 */
const WATSONX_CONFIG = {
  url:        'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29',
  model:      'meta-llama/llama-3-3-70b-instruct',
  projectId:  localStorage.getItem('pocketly_wx_project') || '',
  iamToken:   localStorage.getItem('pocketly_wx_token')   || '',
};

const CHAT_STORAGE_KEY = 'pocketly_chat_history';
const MAX_HISTORY      = 20; // keep last N messages to stay within token limit

// ─────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────

/**
 * Build the system prompt injected at the top of every conversation.
 * Injects a live snapshot of the user's transaction data.
 */
function buildSystemPrompt() {
  const txs       = getAllTransactions();
  const snapshot  = buildFinancialSnapshot(txs);

  return `Anda adalah Pocketly AI, asisten keuangan pribadi yang ramah, jelas, dan mudah dipahami.

TUGAS ANDA:
- Menganalisis pemasukan dan pengeluaran pengguna.
- Mengidentifikasi kategori pengeluaran terbesar.
- Memberikan ringkasan kondisi keuangan berdasarkan data transaksi nyata.
- Membantu pengguna memahami pola pengeluaran.
- Memberikan rekomendasi penghematan yang realistis dan praktis.
- Menjawab pertanyaan seputar pengelolaan keuangan pribadi.

ATURAN:
- Gunakan format Rupiah (IDR) saat menyebut nominal, contoh: Rp1.500.000.
- Jangan mengarang angka yang tidak ada di data transaksi.
- Jika data belum cukup, minta pengguna menambahkan transaksi terlebih dahulu.
- Hindari saran investasi berisiko atau keputusan finansial spekulatif.
- Gunakan poin-poin atau tabel sederhana agar mudah dibaca.
- Jawab dalam Bahasa Indonesia yang santai namun profesional.
- Jawaban ringkas dan to the point — tidak perlu panjang jika pertanyaannya sederhana.

DATA KEUANGAN PENGGUNA SAAT INI:
${snapshot}

Gunakan data di atas sebagai konteks untuk semua jawaban Anda.`;
}

/**
 * Build a concise text snapshot of the user's finances.
 * @param {Array} txs
 * @returns {string}
 */
function buildFinancialSnapshot(txs) {
  if (!txs || txs.length === 0) {
    return 'Belum ada transaksi tercatat.';
  }

  const totalIncome   = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense  = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance       = totalIncome - totalExpense;

  // Category breakdown (expenses only)
  const catMap = {};
  txs.filter(t => t.type === 'expense').forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  });
  const catLines = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `  - ${cat}: ${formatRupiah(amt)}`)
    .join('\n');

  // Last 5 transactions
  const recent = [...txs]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
    .map(t => `  - ${t.date} | ${t.type === 'income' ? '+' : '-'}${formatRupiah(t.amount)} | ${t.name} (${t.category})`)
    .join('\n');

  // Monthly breakdown (last 3 months)
  const months = lastThreeMonths();
  const monthLines = months.map(({ year, month, label }) => {
    const sub    = txs.filter(t => { const d = new Date(t.date + 'T00:00:00'); return d.getFullYear() === year && d.getMonth() === month; });
    const inc    = sub.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp    = sub.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return `  - ${label}: Income ${formatRupiah(inc)}, Expense ${formatRupiah(exp)}, Net ${formatRupiah(inc - exp)}`;
  }).join('\n');

  return `Total Saldo: ${formatRupiah(balance)}
Total Pemasukan: ${formatRupiah(totalIncome)}
Total Pengeluaran: ${formatRupiah(totalExpense)}
Jumlah Transaksi: ${txs.length}

Pengeluaran per Kategori:
${catLines || '  (tidak ada pengeluaran)'}

Ringkasan 3 Bulan Terakhir:
${monthLines}

5 Transaksi Terbaru:
${recent}`;
}

function lastThreeMonths() {
  const result = [];
  const now    = new Date();
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      year: d.getFullYear(), month: d.getMonth(),
      label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    });
  }
  return result;
}

// ─────────────────────────────────────────────
// CHAT HISTORY (localStorage)
// ─────────────────────────────────────────────

/** @returns {{ role: string, content: string }[]} */
function loadChatHistory() {
  try {
    return JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '[]');
  } catch { return []; }
}

/** @param {{ role: string, content: string }[]} history */
function saveChatHistory(history) {
  // Keep only the last MAX_HISTORY messages
  const trimmed = history.slice(-MAX_HISTORY);
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(trimmed));
}

function clearChatHistory() {
  localStorage.removeItem(CHAT_STORAGE_KEY);
}

// ─────────────────────────────────────────────
// API CALL
// ─────────────────────────────────────────────

/**
 * Send a conversation to watsonx.ai and return the assistant reply.
 * @param {{ role: string, content: string }[]} messages  – full conversation array
 * @returns {Promise<string>} assistant reply text
 */
async function callWatsonx(messages) {
  const { url, model, projectId, iamToken } = WATSONX_CONFIG;

  if (!iamToken || !projectId) {
    throw new Error('CREDENTIALS_MISSING');
  }

  // Convert chat messages to a single prompt string in Llama chat format
  const prompt = formatLlamaPrompt(messages);

  const body = {
    model_id:   model,
    project_id: projectId,
    input:      prompt,
    parameters: {
      decoding_method: 'greedy',
      max_new_tokens:  600,
      stop_sequences:  ['<|eot_id|>', '<|start_header_id|>'],
      temperature:     0.7,
    },
  };

  const response = await fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${iamToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API_ERROR: ${response.status} – ${err}`);
  }

  const data = await response.json();
  const text = data?.results?.[0]?.generated_text?.trim() || '';
  return text;
}

/**
 * Format messages array into Llama 3 instruct prompt format.
 * @param {{ role: string, content: string }[]} messages
 * @returns {string}
 */
function formatLlamaPrompt(messages) {
  let prompt = '<|begin_of_text|>';
  messages.forEach(msg => {
    prompt += `<|start_header_id|>${msg.role}<|end_header_id|>\n\n${msg.content}<|eot_id|>`;
  });
  prompt += '<|start_header_id|>assistant<|end_header_id|>\n\n';
  return prompt;
}

// ─────────────────────────────────────────────
// UI RENDERING
// ─────────────────────────────────────────────

/** Render one chat bubble into the messages container. */
function appendMessage(role, text, container) {
  const wrap = document.createElement('div');
  wrap.className = `chat-bubble-wrap chat-bubble-wrap--${role}`;

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble chat-bubble--${role}`;
  bubble.innerHTML = renderMarkdown(text);

  wrap.appendChild(bubble);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  return wrap;
}

/** Show an animated typing indicator. */
function showTyping(container) {
  const wrap = document.createElement('div');
  wrap.className = 'chat-bubble-wrap chat-bubble-wrap--assistant';
  wrap.id = 'typingIndicator';
  wrap.innerHTML = `
    <div class="chat-bubble chat-bubble--assistant chat-bubble--typing">
      <span></span><span></span><span></span>
    </div>`;
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

function hideTyping() {
  document.getElementById('typingIndicator')?.remove();
}

/**
 * Very lightweight Markdown → HTML converter.
 * Handles: **bold**, *italic*, `code`, bullet lists, line breaks.
 */
function renderMarkdown(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="chat-code">$1</code>')
    // Bullet list items
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>[\s\S]*?<\/li>)(?=\s*<li>|$)/g, (m) => `<ul class="chat-list">${m}</ul>`)
    // Clean up double-wrapped uls
    .replace(/<\/ul>\s*<ul class="chat-list">/g, '')
    // Line breaks
    .replace(/\n/g, '<br>');
}

// ─────────────────────────────────────────────
// CREDENTIALS SETUP MODAL
// ─────────────────────────────────────────────

function showCredentialsModal(onSave) {
  const existing = document.getElementById('credentialsModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'credentialsModal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '400';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:440px">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-bold text-gray-900">Connect to Pocketly AI</h3>
        <button id="closeCredsModal" class="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <p class="text-sm text-gray-500 mb-4">
        Pocketly AI ditenagai oleh <strong>IBM watsonx.ai</strong>.
        Masukkan kredensial Anda untuk mulai menggunakan asisten keuangan ini.
      </p>

      <div class="space-y-3">
        <div class="form-group">
          <label class="form-label">IAM Access Token</label>
          <input id="credsToken" type="password" class="form-control text-sm"
            placeholder="Paste your IBM IAM token here…"
            value="${escapeHtml(localStorage.getItem('pocketly_wx_token') || '')}" />
          <span class="text-xs text-gray-400 mt-1 block">
            Dapatkan token via: <code class="chat-code">ibmcloud iam oauth-tokens</code>
          </span>
        </div>
        <div class="form-group">
          <label class="form-label">watsonx Project ID</label>
          <input id="credsProject" type="text" class="form-control text-sm"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value="${escapeHtml(localStorage.getItem('pocketly_wx_project') || '')}" />
          <span class="text-xs text-gray-400 mt-1 block">
            Temukan di halaman Project → Manage → General di watsonx.ai.
          </span>
        </div>
      </div>

      <div class="flex gap-3 mt-5">
        <button id="cancelCredsModal" class="btn btn--outline flex-1">Batal</button>
        <button id="saveCredsModal" class="btn btn--primary flex-1">Simpan & Mulai</button>
      </div>

      <p class="text-xs text-gray-400 mt-4 text-center">
        Kredensial disimpan hanya di browser ini (localStorage).
      </p>
    </div>`;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  document.getElementById('closeCredsModal').addEventListener('click', close);
  document.getElementById('cancelCredsModal').addEventListener('click', close);
  document.getElementById('saveCredsModal').addEventListener('click', () => {
    const token   = document.getElementById('credsToken').value.trim();
    const project = document.getElementById('credsProject').value.trim();
    if (!token || !project) {
      showToast('Isi token dan project ID terlebih dahulu.', 'error');
      return;
    }
    localStorage.setItem('pocketly_wx_token', token);
    localStorage.setItem('pocketly_wx_project', project);
    WATSONX_CONFIG.iamToken  = token;
    WATSONX_CONFIG.projectId = project;
    close();
    if (onSave) onSave();
  });
}

// ─────────────────────────────────────────────
// MAIN CHAT PANEL INIT
// ─────────────────────────────────────────────

/**
 * Inject the floating chat button and side panel into the page.
 * Call once per page after DOMContentLoaded.
 */
function initChat() {
  // ── Inject HTML ──
  const chatHTML = `
    <!-- Floating AI button -->
    <button id="chatFab" aria-label="Open AI Assistant" title="Pocketly AI">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
      </svg>
    </button>

    <!-- Chat panel -->
    <div id="chatPanel" class="chat-panel" aria-hidden="true">
      <!-- Panel header -->
      <div class="chat-header">
        <div class="flex items-center gap-2">
          <div class="chat-avatar">AI</div>
          <div>
            <p class="text-sm font-bold text-white leading-tight">Pocketly AI</p>
            <p class="text-xs" style="color:rgba(255,255,255,.65)">Financial Assistant</p>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <!-- Settings / credentials button -->
          <button id="chatSettingsBtn" title="API Settings"
            class="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style="color:rgba(255,255,255,.7)" onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background=''">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </button>
          <!-- Clear chat -->
          <button id="chatClearBtn" title="Clear chat"
            class="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style="color:rgba(255,255,255,.7)" onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background=''">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
          <!-- Close -->
          <button id="chatCloseBtn" title="Close"
            class="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style="color:rgba(255,255,255,.7)" onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background=''">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Messages area -->
      <div id="chatMessages" class="chat-messages" role="log" aria-live="polite"></div>

      <!-- Suggestion chips (shown when chat is empty) -->
      <div id="chatChips" class="chat-chips">
        <button class="chat-chip" data-msg="Bagaimana kondisi keuanganku bulan ini?">📊 Ringkasan bulan ini</button>
        <button class="chat-chip" data-msg="Kategori pengeluaran terbesar saya apa?">🔍 Pengeluaran terbesar</button>
        <button class="chat-chip" data-msg="Berikan tips penghematan berdasarkan data saya.">💡 Tips hemat</button>
        <button class="chat-chip" data-msg="Apakah saldo saya aman untuk bulan ini?">💰 Cek saldo</button>
      </div>

      <!-- Input area -->
      <div class="chat-input-area">
        <textarea id="chatInput" class="chat-input" placeholder="Tanya tentang keuanganmu…" rows="1"
          aria-label="Chat input"></textarea>
        <button id="chatSendBtn" class="chat-send-btn" aria-label="Kirim">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
        </button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', chatHTML);

  // ── Element refs ──
  const fab        = document.getElementById('chatFab');
  const panel      = document.getElementById('chatPanel');
  const messages   = document.getElementById('chatMessages');
  const input      = document.getElementById('chatInput');
  const sendBtn    = document.getElementById('chatSendBtn');
  const closeBtn   = document.getElementById('chatCloseBtn');
  const clearBtn   = document.getElementById('chatClearBtn');
  const settingsBtn= document.getElementById('chatSettingsBtn');
  const chips      = document.getElementById('chatChips');

  /** @type {{ role: string, content: string }[]} */
  let chatHistory = loadChatHistory();
  let isOpen      = false;
  let isSending   = false;

  // ── Open / close panel ──
  function openPanel() {
    isOpen = true;
    panel.classList.add('chat-panel--open');
    panel.setAttribute('aria-hidden', 'false');
    fab.classList.add('chat-fab--hidden');
    renderHistory();
    setTimeout(() => input.focus(), 150);
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove('chat-panel--open');
    panel.setAttribute('aria-hidden', 'true');
    fab.classList.remove('chat-fab--hidden');
  }

  fab.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) closePanel();
  });

  // ── Settings ──
  settingsBtn.addEventListener('click', () => showCredentialsModal());

  // ── Clear chat ──
  clearBtn.addEventListener('click', () => {
    chatHistory = [];
    clearChatHistory();
    messages.innerHTML = '';
    chips.classList.remove('hidden');
    showWelcome();
  });

  // ── Suggestion chips ──
  chips.addEventListener('click', e => {
    const chip = e.target.closest('.chat-chip');
    if (chip) {
      chips.classList.add('hidden');
      sendMessage(chip.dataset.msg);
    }
  });

  // ── Send on button / Enter ──
  sendBtn.addEventListener('click', () => trySend());
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); trySend(); }
  });

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    if (chatHistory.length > 0) chips.classList.add('hidden');
  });

  function trySend() {
    const text = input.value.trim();
    if (!text || isSending) return;
    input.value = '';
    input.style.height = 'auto';
    chips.classList.add('hidden');
    sendMessage(text);
  }

  // ── Render persisted history ──
  function renderHistory() {
    messages.innerHTML = '';
    if (chatHistory.length === 0) {
      showWelcome();
      chips.classList.remove('hidden');
    } else {
      chips.classList.add('hidden');
      // Skip the system message (index 0) from display
      chatHistory
        .filter(m => m.role !== 'system')
        .forEach(m => appendMessage(m.role, m.content, messages));
    }
  }

  function showWelcome() {
    appendMessage('assistant',
      'Halo! Saya **Pocketly AI**, asisten keuangan pribadi Anda. 👋\n\nSaya bisa membantu Anda:\n- Menganalisis kondisi keuangan\n- Mengidentifikasi pengeluaran terbesar\n- Memberikan tips penghematan\n\nApa yang ingin Anda ketahui tentang keuangan Anda hari ini?',
      messages);
  }

  // ── Core send logic ──
  async function sendMessage(userText) {
    if (isSending) return;

    // Check credentials first
    if (!WATSONX_CONFIG.iamToken || !WATSONX_CONFIG.projectId) {
      appendMessage('assistant',
        '⚙️ Saya perlu kredensial IBM watsonx.ai untuk berfungsi.\n\nKlik tombol **⚙ Settings** di pojok kanan atas panel ini, lalu masukkan:\n- **IAM Access Token**\n- **watsonx Project ID**',
        messages);
      return;
    }

    isSending = true;
    sendBtn.disabled = true;

    // Show user message
    appendMessage('user', userText, messages);

    // Build messages array: system + history + new user message
    const systemPrompt = buildSystemPrompt();
    const newUserMsg   = { role: 'user', content: userText };

    // Build the full context: system + prior turns (without system) + new user
    const priorTurns = chatHistory.filter(m => m.role !== 'system');
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...priorTurns,
      newUserMsg,
    ];

    // Show typing indicator
    showTyping(messages);

    let replyText = '';
    try {
      replyText = await callWatsonx(apiMessages);
      if (!replyText) replyText = 'Maaf, saya tidak mendapatkan respons. Silakan coba lagi.';
    } catch (err) {
      if (err.message === 'CREDENTIALS_MISSING') {
        replyText = '⚙️ Token atau Project ID belum diatur. Klik tombol Settings untuk mengaturnya.';
      } else if (err.message.includes('401')) {
        replyText = '🔑 Token IAM tidak valid atau sudah kedaluwarsa. Perbarui token melalui Settings.';
      } else if (err.message.includes('403')) {
        replyText = '🚫 Akses ditolak. Pastikan Project ID benar dan token memiliki izin yang cukup.';
      } else {
        replyText = `❌ Terjadi kesalahan: ${err.message}\n\nPastikan koneksi internet dan kredensial Anda benar.`;
      }
    }

    hideTyping();
    appendMessage('assistant', replyText, messages);

    // Persist: add new user + assistant messages to history
    chatHistory.push(newUserMsg);
    chatHistory.push({ role: 'assistant', content: replyText });
    saveChatHistory(chatHistory);

    isSending       = false;
    sendBtn.disabled = false;
    input.focus();
  }

  // Initial render if panel was open before (unlikely, but safe)
  renderHistory();
}
