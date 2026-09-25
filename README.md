# Ledger — a private budget tracker

Now split into two separate pages instead of one page that shows/hides
sections:

- `login.html` — the sign-in screen, with its own logic in `auth.js`
- `ledger.html` — the budget tracker itself, with its own logic in `app.js`
- `index.html` — just forwards visitors to `login.html`, so your site's root link still works
- `styles.css` — shared look for both pages
- `firebase-config.js` — your Firebase project's keys, shared by both pages

**How the two pages talk to each other:**
- `login.html` signs you in, then sends you to `ledger.html`.
- `ledger.html` checks if you're signed in the moment it loads. If not, it immediately sends you back to `login.html` — so there's no way to view the ledger by just guessing the URL without logging in first.
- Clicking "Sign out" on `ledger.html` signs you out, which then bounces you back to `login.html` automatically.

Everything else — creating your Firebase project, turning on Email/Password
sign-in, adding users, setting up Firestore and its security rules,
deploying to GitHub Pages, and authorizing your domain — works exactly the
way it did before. Nothing about the Firebase setup changes; only how the
two screens are organized as files.

## Uploading this update

If you already have the single-file version pushed to GitHub, replace your
old `index.html` and `app.js` with the new versions here, and add the two
new files (`login.html` and `auth.js`). Then:

```
git add .
git commit -m "split login and ledger into separate pages"
git push
```

Your existing Firebase project, users, and saved entries are untouched —
this change only affects the front-end files, not your data.
