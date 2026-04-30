# SafiHub HRIS

Lightweight HR platform with three user roles — **admin**, **employer**, and **employee** — backed by Firebase Auth + Firestore.

## How accounts work

1. **Admins are created in Firebase Console** (Authentication → Add user). The platform supports **many admins** — any Firebase Auth user that has no Firestore profile yet is treated as an admin on first sign-in (the in-app create-user flow always pre-creates a Firestore profile, so the only way to land in this state is to be added in the Firebase Console). On first sign-in, the app auto-creates the admin's Firestore profile with `role: "admin"` and `status: "active"`. To provision a new admin, just add them in the Firebase Console — they can sign in immediately.
2. **Admin signs in** and creates `employer` / `employee` accounts from the **Users** page. Each new account gets:
   - A randomly generated **temporary password** (shown on the dashboard for **60 seconds**, with countdown + copy button, then auto-deleted from Firestore).
   - `status: "pending_approval"` — the user cannot sign in yet.
   - `mustChangePassword: true`.
3. Admin shares the temp credentials with the user, then **approves** the account from the same Users page.
4. The user signs in. Until approval, they see "Awaiting admin approval" on the login screen. After approval, on first login they're sent to **Set New Password** to replace the temp one.
5. Once they've set a permanent password, they're redirected to their role-based dashboard.
6. Every user can edit their **profile** (name, email, phone) and change their password from `/profile`.

## Linking employer ↔ employee

The admin creates a **contract** at `/admin/contracts` that links one employer with one employee, plus a position and start date. Employers see their linked employees on their dashboard; employees see their employer.

## Public holidays + holiday work reporting

- A `public_holidays` collection holds Kenya holidays. It is **auto-seeded** with the 2025–2026 dates the first time an admin signs in (only admin can write; rules enforce this).
- Every dashboard (admin / employer / employee) shows an **Upcoming holidays** widget that lists holidays falling within the next **12 days**, with a visible countdown ("Today" / "Tomorrow" / "In N days").

## Employee Home page

The employee dashboard shows:
- A header card with welcome, **status badge** (Pending / Approved / Active), employer name, and **contract start date**, plus a **Profile** link.
- The **Upcoming holidays** widget.
- **Three coral activity buttons**: Request Leave, Report Overtime, Report Holiday.
- A contract overview (employer + position + start date).

## Employee forms

All three forms are wrapped in an **`ActivationGate`** that checks (1) the user's status is `approved` or `active`, and (2) they have at least one contract linked. Otherwise it shows a friendly blocking message. In dev mode it logs gate evaluation to the console.

| Route | Purpose | Validation | Writes to |
| --- | --- | --- | --- |
| `/employee/leave` | Annual / Sick / Unpaid / Compassionate leave with date range and auto day count | End date ≥ start date; notes required for Sick | `leave_requests` (status: pending) |
| `/employee/overtime` | Log overtime hours on a regular day | No future dates; hours 0.5–24, step 0.5 | `overtime_clock_records` (isHoliday: false, status: pending) |
| `/employee/holiday` | Log hours worked on a Kenya public holiday | Only public-holiday dates selectable | `overtime_clock_records` (isHoliday: true, status: pending) |

After the user sets their permanent password on `/set-password`, their status auto-transitions from `approved` → `active` (rule allows this single self-transition; no other status change is permitted by the user).

## Tech

- React 18 + Vite 6, Tailwind v4, wouter for routing.
- **Firebase Auth + Firestore** (web SDK only — no server).
- **Supabase Storage** for all file uploads (profile pictures + documents). The app uses Supabase only for object storage; auth/db remain on Firebase. See `SUPABASE_SETUP.md` for bucket + policy setup.
- A **secondary Firebase app instance** is used when admin creates new users so the admin's session is never disturbed.

## Project structure

```
src/
  lib/
    firebase.js      Primary + secondary Firebase apps
    constants.js     Roles, statuses, collection names, TTL
    utils.js         Helpers (temp-password generator, formatters)
  context/
    AuthContext.jsx  Auth state, sign-in, profile bootstrap
  components/
    Layout.jsx       Top nav (role-aware) + logout
    ProtectedRoute.jsx
    Spinner.jsx
  pages/
    Login.jsx
    SetNewPassword.jsx   Forced reset on first login
    Profile.jsx          Edit name/email/phone + change password
    Dashboard.jsx        Role-based redirector
    Unauthorized.jsx
    admin/
      Dashboard.jsx
      Users.jsx          Create / approve / disable, temp-password viewer
      Contracts.jsx      Link employer ↔ employee
    employer/
      Dashboard.jsx      Linked employees
    employee/
      Dashboard.jsx      Linked employer + contract
```

## Firestore collections

- `users/{uid}`: `{ uid, fullName, email, phone, role, status, mustChangePassword, tempPassword?, tempPasswordCreatedAtMs?, createdAt, updatedAt, approvedAt? }`
- `contracts/{id}`: `{ employerId, employeeId, employerName, employerEmail, employeeName, employeeEmail, employeePhone, position, startDate, active, createdAt, updatedAt? }`. `active` defaults to `true` on create; admin can flip it from the Contracts page (Activate / Deactivate button), each toggle writes a `contract.activated` / `contract.deactivated` entry to `activity_logs`. Employee/employer name & contact are *snapshotted* on the contract at creation time so employers can render their My Employees / Leave / Timesheets pages without needing read access to other users' profile docs.
- `leave_requests/{id}`: `{ employeeId, employerId, type, startDate, endDate, days, notes, status, createdAt, decidedAt?, decidedBy? }`
- `overtime_clock_records/{id}`: `{ employeeId, employerId, date, hours, notes, isHoliday, holidayName?, status, createdAt, decidedAt?, decidedBy? }`
- `public_holidays/{id}`: `{ date, name, country }` — auto-seeded by admin on first login from `holidaySeed.js` (Kenya).
- `activity_logs/{id}`: `{ action, performedBy, role, metadata, createdAt }` — append-only via `logAction()` in `src/lib/audit.js`. Admin-only read; no updates allowed. Action names live in `AUDIT_ACTIONS` (e.g. `account.created`, `contract.activated`, `contract.deactivated`, `leave.approved`).
- `documents/{id}`: `{ ownerId, ownerName, ownerEmail, ownerRole, category, title, fileName, contentType, size, storagePath, storageBucket, storageProvider, downloadURL, uploadedBy, uploadedByName, uploadedAt }` — admin-managed file metadata; the actual file lives in Supabase Storage in the `documents` bucket at `{ownerId}/{timestamp}_{filename}`. `downloadURL` is the public Supabase URL. Owner can read the metadata doc; admin can CRUD all.
- `monthly_records/{id}` *(Sprint 3 schema, no UI yet)*: `{ employerId, employeeId, contractId, month, type, ... }` where `type` ∈ `payslip` / `statutory` / `payroll_summary` and `month` is `YYYY-MM`. Schema + validators in `src/lib/documents.js` (`DOCUMENT_TYPES`, `DOCUMENT_SCHEMA`, `formatMonth`, `validateDocumentRecord`) — `validateDocumentRecord()` *rejects* monthly records with a null/empty `contractId` or `month`. Firestore rules: employer (the linked one) writes, both employer + employee read, admin manages.

Security rules are in `firestore.rules` — admin-only writes for users/contracts/documents, self-read for own profile, employer/employee can read contracts/leave/overtime they're part of, monthly_records writable by the linked employer (must include `contractId` + `month`) and readable by both parties, activity logs are append-only with admin-only read. **There are no Firebase Storage rules** — files live in Supabase Storage; bucket configuration is documented in `SUPABASE_SETUP.md`.

## File storage (Supabase)

Two **public** Supabase Storage buckets:

- `avatars/{firebaseUid}/avatar.jpg` — one file per user, overwritten on upload (`upsert: true`). The image is resized to 480 px JPEG client-side first.
- `documents/{ownerFirebaseUid}/{timestamp}_{safeFilename}` — one object per uploaded document. Timestamp prefix prevents same-name collisions.

The Supabase client lives in `src/lib/supabase.js` (`supabase`, `SUPABASE_BUCKETS`). Uploads use the anon key. Because the buckets are public, downloads use `getPublicUrl()` (no signed URL / expiry). Delete uses `supabase.storage.from(bucket).remove([path])`.

> **Security model**: public buckets — anyone with the URL can read; anyone with the anon key can write. This is the "ship-fast" model the user picked. To tighten, switch to signed URLs + a backend, or bridge Firebase Auth into Supabase Auth so RLS can scope writes to the signed-in user.

## Documents feature

- **Admin uploads** at `/admin/documents`: pick a target user (employee or employer), category (Contract / Payslip / ID / Policy / Other), optional title, then a file. PDF, Word, Excel, PowerPoint, plain text, CSV and any image are accepted up to 25 MB. The progress bar is indeterminate (Supabase JS doesn't expose per-byte progress). Each upload writes the file to the Supabase `documents` bucket + a metadata doc to Firestore `documents`.
- **Employer view** at `/employer/documents` and **employee view** at `/employee/documents` (also linked from the sidebar) show a clean read-only list of files where `ownerId == auth.uid` with title, category badge, file size, upload date, and an Open button that opens the file directly from Supabase.
- Helpers live in `src/lib/documents.js` (`uploadDocument`, `deleteDocument`, `isAllowedDocumentType`, `humanFileSize`, `fileKindLabel`). The shared list UI is in `src/components/DocumentList.jsx`.
- **Profile pictures** use the same Supabase setup (`avatars/{uid}/avatar.jpg`, image-only, max 5 MB on the client) — image is auto-resized to 480 px and re-encoded as JPEG before upload, then the photoURL on the Firestore `users` doc is updated with a cache-busted public URL.

## Environment variables

Required (Vite-exposed):
- Firebase: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
  `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
- Supabase: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAIL` — the email of the Firebase-created admin (currently `admin@safihub.com`).

## Setup checklist (for the admin)

1. In Firebase Console → Authentication, enable **Email/Password** sign-in.
2. Create a user with email `admin@safihub.com` and the password you want to use.
3. Deploy `firestore.rules`.
4. In Supabase, follow `SUPABASE_SETUP.md` to create the two public buckets (`avatars`, `documents`) and add the upload/update/delete policies.
5. Sign in to the app — your admin profile is auto-created on first login.
