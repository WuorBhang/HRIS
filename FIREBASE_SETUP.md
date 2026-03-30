# Firebase Setup Guide

## Step 1 — Enable Email/Password Authentication

In your Firebase Console:
1. Go to **Authentication → Sign-in method**
2. Enable **Email/Password**

## Step 2 — Create the Demo Admin Account

The account `demo@konexioassessment.com` must be created in Firebase Auth manually or via Admin SDK.

### Option A: Firebase Console (Quick)
1. Go to **Authentication → Users → Add user**
2. Email: `demo@konexioassessment.com`
3. Password: `assessmentdemo2026`

### Option B: Admin SDK Script (Recommended for Production)
Use the `functions/assignRole.js` script to set Custom Claims after creating the user:

```js
// functions/assignRole.js
const admin = require("firebase-admin");
admin.initializeApp();

async function assignRole(uid, role) {
  await admin.auth().setCustomUserClaims(uid, { role });
  console.log(`Set role '${role}' on user ${uid}`);
}

// After creating the user, get their UID and run:
assignRole("<uid-of-demo-account>", "admin");
```

## Step 3 — Set Custom Claims for the Demo Account

After creating the user, set `role: "admin"` as a Custom Claim via Admin SDK.
This is why roles are more secure than Firestore fields:
- Custom Claims are set server-side only, signed into the ID token by Firebase
- A client CANNOT forge or modify Custom Claims
- If roles were stored in Firestore, a client could potentially manipulate
  the Firestore document (or a misconfigured rule could allow it)

## Step 4 — Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

## Step 5 — Firestore Indexes

The `employees` collection queries use:
- `employerId` (ascending) — for employer-scoped queries
- `employerId + createdAt` — for sorted employee lists

Create these in `firestore.indexes.json` or via the Console.

## Role Reference

| Role      | Employees | Users | Documents | Admin Panel |
|-----------|-----------|-------|-----------|-------------|
| admin     | All       | All   | All       | Yes         |
| it-expert | All (read+write) | No | All | No       |
| employer  | Own only  | No    | Own only  | No          |
| user      | None      | No    | Own       | No          |
