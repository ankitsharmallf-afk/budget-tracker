// ============================================================
// Ledger — budget tracker app logic
// Uses Firebase Auth (email/password) + Firestore.
// Data model: budgets/{uid}/transactions/{docId}
//   { description, amount, type: "income"|"expense", category, date: "YYYY-MM-DD", createdAt }
// ============================================================

const auth = firebase.auth();
const db = firebase.firestore();

// ---------- Element refs ----------
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');
const userEmailEl = document.getElementById('user-email');
const signoutBtn = document.getElementById('signout-btn');

const monthSelect = document.getElementById('month-select');
const balanceFigure = document.getElementById('balance-figure');
const incomeFigure = document.getElementById('income-figure');
const expenseFigure = document.getElementById('expense-figure');

const entryForm = document.getElementById('entry-form');
const entrySubmit = document.getElementById('entry-submit');
const toggleExpense = document.getElementById('toggle-expense');
const toggleIncome = document.getElementById('toggle-income');
const entryDate = document.getElementById('entry-date');

const ledgerEmpty = document.getElementById('ledger-empty');
const ledgerTable = document.getElementById('ledger-table');
const ledgerRows = document.getElementById('ledger-rows');

const breakdownSection = document.getElementById('breakdown-section');
const breakdownBars = document.getElementById('breakdown-bars');

let currentType = 'expense';
let unsubscribeSnapshot = null;
let allTransactions = [];

// ---------- Helpers ----------
const money = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(n).toFixed(2);
const todayISO = () => new Date().toISOString().slice(0, 10);
const monthKeyOf = (dateStr) => dateStr.slice(0, 7); // "YYYY-MM"

function setDefaultMonth() {
  monthSelect.value = todayISO().slice(0, 7);
}

// ---------- Auth state ----------
auth.onAuthStateChanged((user) => {
  if (user) {
    loginScreen.hidden = true;
    appScreen.hidden = false;
    userEmailEl.textContent = user.email;
    entryDate.value = todayISO();
    setDefaultMonth();
    subscribeToTransactions(user.uid);
  } else {
    appScreen.hidden = true;
    loginScreen.hidden = false;
    if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }
    allTransactions = [];
  }
});

// ---------- Login ----------
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    loginError.textContent = friendlyAuthError(err);
    loginError.hidden = false;
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign in';
  }
});

function friendlyAuthError(err) {
  switch (err.code) {
    case 'auth/invalid-email': return 'That email address doesn\u2019t look right.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Email or password is incorrect.';
    case 'auth/too-many-requests': return 'Too many attempts. Try again in a bit.';
    default: return 'Couldn\u2019t sign in. Please try again.';
  }
}

signoutBtn.addEventListener('click', () => auth.signOut());

// ---------- Type toggle ----------
function setType(type) {
  currentType = type;
  toggleExpense.classList.toggle('active', type === 'expense');
  toggleIncome.classList.toggle('active', type === 'income');
}
toggleExpense.addEventListener('click', () => setType('expense'));
toggleIncome.addEventListener('click', () => setType('income'));

// ---------- Firestore subscription ----------
function subscribeToTransactions(uid) {
  if (unsubscribeSnapshot) unsubscribeSnapshot();
  unsubscribeSnapshot = db.collection('budgets').doc(uid).collection('transactions')
    .orderBy('date', 'desc')
    .onSnapshot((snap) => {
      allTransactions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      render();
    }, (err) => {
      console.error('Firestore read failed:', err);
    });
}

// ---------- Add entry ----------
entryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;

  const description = document.getElementById('entry-desc').value.trim();
  const amount = parseFloat(document.getElementById('entry-amount').value);
  const category = document.getElementById('entry-category').value;
  const date = entryDate.value;

  if (!description || isNaN(amount) || amount <= 0 || !date) return;

  entrySubmit.disabled = true;
  try {
    await db.collection('budgets').doc(user.uid).collection('transactions').add({
      description,
      amount,
      type: currentType,
      category,
      date,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    entryForm.reset();
    entryDate.value = todayISO();
    setType('expense');
  } catch (err) {
    console.error('Failed to add entry:', err);
    alert('Couldn\u2019t save that entry. Check your connection and try again.');
  } finally {
    entrySubmit.disabled = false;
  }
});

// ---------- Delete entry ----------
async function deleteEntry(id) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await db.collection('budgets').doc(user.uid).collection('transactions').doc(id).delete();
  } catch (err) {
    console.error('Failed to delete entry:', err);
  }
}

// ---------- Render ----------
monthSelect.addEventListener('change', render);

function render() {
  const month = monthSelect.value; // "YYYY-MM"
  const monthTx = allTransactions.filter((t) => monthKeyOf(t.date) === month);

  const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  balanceFigure.textContent = money(income - expense);
  incomeFigure.textContent = money(income);
  expenseFigure.textContent = money(expense);

  renderBreakdown(monthTx.filter((t) => t.type === 'expense'), expense);
  renderLedger(monthTx);
}

function renderBreakdown(expenseTx, totalExpense) {
  if (expenseTx.length === 0) {
    breakdownSection.hidden = true;
    return;
  }
  breakdownSection.hidden = false;

  const byCategory = {};
  expenseTx.forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });

  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  breakdownBars.innerHTML = sorted.map(([category, amount]) => {
    const pct = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
    return `
      <div class="bar-row">
        <span>${escapeHtml(category)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <span class="bar-amount">${money(amount)}</span>
      </div>`;
  }).join('');
}

function renderLedger(monthTx) {
  if (monthTx.length === 0) {
    ledgerEmpty.hidden = false;
    ledgerTable.hidden = true;
    return;
  }
  ledgerEmpty.hidden = true;
  ledgerTable.hidden = false;

  ledgerRows.innerHTML = monthTx.map((t) => {
    const sign = t.type === 'income' ? '+' : '\u2212';
    const cls = t.type === 'income' ? 'in' : 'out';
    return `
      <div class="ledger-row">
        <span>${formatShortDate(t.date)}</span>
        <span>${escapeHtml(t.description)}</span>
        <span><span class="category-tag">${escapeHtml(t.category)}</span></span>
        <span class="amount ${cls}">${sign} ${money(t.amount)}</span>
        <button class="row-delete" title="Delete entry" data-id="${t.id}" aria-label="Delete entry">\u2715</button>
      </div>`;
  }).join('');

  ledgerRows.querySelectorAll('.row-delete').forEach((btn) => {
    btn.addEventListener('click', () => deleteEntry(btn.dataset.id));
  });
}

function formatShortDate(iso) {
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
