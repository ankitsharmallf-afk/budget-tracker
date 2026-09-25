# Ledger — a private budget tracker

A small web app with a login screen, a budget ledger, and Firebase behind it
so your data is saved online. Only people you create accounts for can sign
in — there is no public sign-up page.

Files:
- `index.html` — the page structure (login screen + app)
- `styles.css` — the look
- `app.js` — the logic (auth, add/delete entries, totals, rendering)
- `firebase-config.js` — **you fill this in** with your own Firebase project's keys

## 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and click **Add project**. Free "Spark" plan is enough for personal use.
2. Once created, click the **`</>`** (web) icon to register a web app. Give it any nickname. You don't need Firebase Hosting for this — you're deploying to GitHub Pages instead.
3. Firebase will show you a `firebaseConfig` object. Copy it.
4. Open `firebase-config.js` in this project and paste your values in, replacing the placeholders.

   This file becomes public once it's on GitHub — that's normal and safe for Firebase web apps. The config is just an address book (which project to talk to), not a secret. **Actual security comes from the sign-in requirement and the Firestore rules in step 3** below, not from hiding this file.

## 2. Turn on Email/Password sign-in

1. In the Firebase console, go to **Build → Authentication → Sign-in method**.
2. Enable **Email/Password**.
3. Go to the **Users** tab and click **Add user** for each person you want to have access — just an email and a password you set for them. Share the password with them however you'd share any password; they can't reset it themselves unless you also build a "forgot password" flow (not included here, to keep the door firmly closed to anyone else).

This is what makes access "limited" — you are the only one who can create accounts, and only those accounts can log in.

## 3. Turn on Firestore and lock it down

1. In the console, go to **Build → Firestore Database → Create database**. Start in **production mode**, pick a region close to you.
2. Go to the **Rules** tab and replace the contents with:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /budgets/{userId}/transactions/{entryId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

   This means: a signed-in person can only ever read or write their **own**
   budget document, never anyone else's, and no one who isn't signed in can
   touch anything. Click **Publish**.

   By default this app stores everyone's entries under their own account
   (each person only ever sees their own ledger). If you instead want
   **one shared household ledger** that every logged-in person can see and
   edit together, that's a small change — just ask and I'll adjust the data
   model and rules for that.

## 4. Put it on GitHub Pages

1. Create a new GitHub repository and push these four files to it (root of the repo, or a `/docs` folder — your choice).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a branch," pick your branch (usually `main`) and the folder you used, then **Save**.
4. GitHub will give you a URL like `https://yourusername.github.io/your-repo/`. That's your live, private-login budget tracker.

One more Firebase step once you have that URL: in the console go to
**Authentication → Settings → Authorized domains** and add your
`yourusername.github.io` domain (GitHub Pages' domain is not authorized by
default, so sign-in will fail until you add it).

## How it works day to day

- **Sign in** with an email/password you set up in step 2.
- **Add an entry**: choose "Money out" or "Money in," fill in description, amount, category and date.
- The **balance, income/expense totals, and category breakdown** update live and are scoped to whichever month you have selected.
- Everything saves to Firestore instantly and syncs across devices — sign in from your phone and you'll see the same ledger.
- **Sign out** with the button top-right.

## Extending it

Some natural next additions, if useful later:
- A shared household ledger instead of per-person ledgers (see step 3 note above)
- Editing an existing entry instead of only add/delete
- Exporting a month to CSV
- Recurring entries (rent, subscriptions)

Happy to build any of these in — just ask.
