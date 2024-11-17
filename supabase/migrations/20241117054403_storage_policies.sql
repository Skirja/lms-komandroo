-- Create storage bucket for project uploads
insert into storage.buckets (id, name, public)
values ('projekUpload', 'projekUpload', false);

-- Enable row level security
alter table storage.objects enable row level security;

-- Create policy to allow authenticated students to upload their own project files
create policy "Students can upload their own project files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'projekUpload' AND
  (auth.role() = 'authenticated') AND
  (storage.foldername(name))[1] = 'projects'
);

-- Create policy to allow students to read their own project files
create policy "Students can read their own project files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'projekUpload' AND
  (auth.role() = 'authenticated')
);

-- Create policy to allow admins to read all project files
create policy "Admins can read all project files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'projekUpload' AND
  auth.jwt() ->> 'role' = 'admin'
);
