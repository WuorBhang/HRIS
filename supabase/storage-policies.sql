-- Supabase Storage policies for HRIS.
-- Run in Supabase SQL editor after creating buckets: avatars (public), documents (public).
-- NOTE: This app uses the Supabase publishable (anon) key from the browser
-- without a Supabase session, so writes come in as the `anon` role. The
-- policies below allow anon to write to ONLY these two buckets. Access
-- control for who-can-upload-what is enforced separately by Firebase Auth +
-- Firestore rules in the application layer.

-- Allow public read on avatars bucket.
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Allow uploads/updates/deletes on the avatars bucket from the app (anon key).
create policy "avatars app write" on storage.objects
  for insert with check (bucket_id = 'avatars');

create policy "avatars app update" on storage.objects
  for update using (bucket_id = 'avatars');

create policy "avatars app delete" on storage.objects
  for delete using (bucket_id = 'avatars');

-- Allow public read on documents bucket.
create policy "documents public read" on storage.objects
  for select using (bucket_id = 'documents');

-- Allow uploads/updates/deletes on the documents bucket from the app (anon key).
create policy "documents app write" on storage.objects
  for insert with check (bucket_id = 'documents');

create policy "documents app update" on storage.objects
  for update using (bucket_id = 'documents');

create policy "documents app delete" on storage.objects
  for delete using (bucket_id = 'documents');
