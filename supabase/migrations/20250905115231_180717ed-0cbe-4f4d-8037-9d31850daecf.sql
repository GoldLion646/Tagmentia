-- Ensure public branding bucket exists
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

-- Replace branding policies safely
drop policy if exists "Branding images are publicly accessible" on storage.objects;
drop policy if exists "Admins can manage branding assets" on storage.objects;

create policy "Branding images are publicly accessible"
  on storage.objects
  for select
  using (bucket_id = 'branding');

create policy "Admins can manage branding assets"
  on storage.objects
  for all
  using (bucket_id = 'branding' and has_role(auth.uid(), 'admin'::app_role))
  with check (bucket_id = 'branding' and has_role(auth.uid(), 'admin'::app_role));