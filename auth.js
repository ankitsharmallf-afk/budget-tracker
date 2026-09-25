// ============================================================
// Logic for login.html only.
// If someone is already signed in, skip straight to the ledger.
// Otherwise, handle the sign-in form and send them there on success.
// ============================================================

const auth = firebase.auth();

const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');

auth.onAuthStateChanged((user) => {
  if (user) {
    window.location.href = 'ledger.html';
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    window.location.href = 'ledger.html';
  } catch (err) {
    loginError.textContent = friendlyAuthError(err);
    loginError.hidden = false;
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
    case 'auth/unauthorized-domain': return 'This website\u2019s domain isn\u2019t authorized in Firebase yet.';
    case 'auth/operation-not-allowed': return 'Email/Password sign-in isn\u2019t turned on in Firebase yet.';
    default: return `Couldn\u2019t sign in (${err.code || 'unknown error'}).`;
  }
}
