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