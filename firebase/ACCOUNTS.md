# Who can log in (you manage this)

The app link opens the **login** screen (username + password only). There is **no register** button. After a successful sign-in you see the home menu.

Behind the scenes, each username is tied to a Firebase login. You add those logins in the Firebase website.

## Firebase settings (one time)

1. Open [Firebase Console](https://console.firebase.google.com/) → your project.
2. Go to **Authentication** → **Sign-in method**.
3. Turn **Email/Password** **On**. Save.
4. Leave **Anonymous** **Off** (not needed).

## Add someone who can use the app

1. **Authentication** → **Users** tab → **Add user**.
2. **Email** must follow this pattern (replace `gabriel` with their username):

   `gabriel@users.fintracker.local`

   Use lowercase letters in the username part.
3. **Password** — choose the password they will type on the login screen.
4. Save.

They sign in on the app with:

- **Username:** `gabriel` (what you put before `@users.fintracker.local`)
- **Password:** the password you set in step 3

## Change or remove access

- **Change password:** Users tab → click the user → reset password.
- **Remove access:** Users tab → delete the user.

Passwords live in **Firebase Authentication** (Google’s secure user store), not in the Firestore database. Expense data stays in Firestore.

Anyone who can sign in sees **all** expenses in the monthly report, not only their own.

After changing rules in this repo, deploy once (from the project folder in WSL):

```bash
npm install
npm run deploy:rules
```

Or without installing: `npx firebase-tools deploy --only firestore:rules`  
(Do **not** use `npx firebase` — that package name does not exist.)
