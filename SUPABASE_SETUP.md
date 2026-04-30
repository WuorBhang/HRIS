# Supabase Storage setup

This app uses **Supabase Storage** for all file uploads (profile pictures and
documents). Auth and the database stay on **Firebase**.

You need to create two **public** buckets and add a few permissive policies
so the browser can upload using the anon key. Do this once per Supabase
project.

## Step 1 — Create the buckets

In the Supabase dashboard → **Storage**:

1. Click **New bucket**, name it `avatars`, toggle **Public bucket** on, save.
2. Click **New bucket**, name it `documents`, toggle **Public bucket** on, save.

## Step 2 — Allow uploads from the browser

Open the **SQL editor** (left sidebar → SQL) and run this once:

```sql
-- Anyone (anon + authenticated) can upload, replace, and delete
-- objects in the avatars and documents buckets. Reads are already
-- allowed because the buckets are public.

create policy "avatars insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'avatars');

create policy "avatars update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'avatars');

create policy "avatars delete" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'avatars');

create policy "documents insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'documents');

create policy "documents update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'documents');

create policy "documents delete" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'documents');
```

That's it — the app should now upload, read, and delete files successfully.

## Security note

You picked the **public bucket** model:

- **Anyone with a file's URL can view it forever.** The URLs are long and
  random-looking, but they are not secret. Don't share them publicly.
- **Anyone holding the anon key can upload to these buckets.** Your anon
  key is bundled into the front-end (it has to be, because the browser
  needs it). If this becomes a concern, switch to signed URLs + a small
  backend that issues them, or bridge Firebase Auth into Supabase Auth
  so RLS can scope writes to the signed-in user.

## Folder layout (what the app writes)

- `avatars/{firebaseUid}/avatar.jpg` — one file per user, overwritten on
  upload. Auto-resized to 480 px JPEG client-side.
- `documents/{ownerFirebaseUid}/{timestamp}_{safeFilename}` — one object
  per uploaded document. Timestamp prefix prevents same-name collisions.
