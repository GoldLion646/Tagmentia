-- Create public branding bucket for site-wide logos/favicons
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

-- Allow anyone to read branding assets
create policy if not exists "Branding images are publicly accessible"
  on storage.objects
  for select
  using (bucket_id = 'branding');

-- Allow admins to manage branding assets (upload/update/delete)
create policy if not exists "Admins can manage branding assets"
  on storage.objects
  for all
  using (bucket_id = 'branding' and has_role(auth.uid(), 'admin'::app_role))
  with check (bucket_id = 'branding' and has_role(auth.uid(), 'admin'::app_role));