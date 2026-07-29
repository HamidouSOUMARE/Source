-- RAG portfolio — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
-- voyage-3 embeddings are 1024-dimensional.

-- 1. Extensions -------------------------------------------------------------
create extension if not exists vector;

-- 2. Tables -----------------------------------------------------------------
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  filename     text not null,
  mime_type    text,
  byte_size    bigint,
  status       text not null default 'processing', -- processing | ready | error
  num_chunks   int  not null default 0,
  storage_path text,
  error        text,
  created_at   timestamptz not null default now()
);

create table if not exists public.chunks (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  chunk_index  int  not null,
  page         int,
  content      text not null,
  embedding    vector(1024) not null,
  created_at   timestamptz not null default now()
);

-- 3. Indexes ----------------------------------------------------------------
create index if not exists chunks_document_id_idx on public.chunks (document_id);
create index if not exists chunks_user_id_idx     on public.chunks (user_id);
create index if not exists documents_user_id_idx  on public.documents (user_id);

-- Cosine-distance HNSW index for fast approximate nearest-neighbour search.
create index if not exists chunks_embedding_idx
  on public.chunks using hnsw (embedding vector_cosine_ops);

-- 4. Row Level Security -----------------------------------------------------
alter table public.documents enable row level security;
alter table public.chunks    enable row level security;

drop policy if exists "own documents" on public.documents;
create policy "own documents" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own chunks" on public.chunks;
create policy "own chunks" on public.chunks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. Similarity search function --------------------------------------------
-- Returns the closest chunks for a user, ordered by cosine similarity.
create or replace function public.match_chunks (
  p_user_id     uuid,
  query_embedding vector(1024),
  match_count   int default 6
)
returns table (
  id          uuid,
  document_id uuid,
  filename    text,
  chunk_index int,
  page        int,
  content     text,
  similarity  float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.document_id,
    d.filename,
    c.chunk_index,
    c.page,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.chunks c
  join public.documents d on d.id = c.document_id
  where c.user_id = p_user_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- 6. Storage bucket ---------------------------------------------------------
-- Private bucket for the original uploaded files.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "own files read"   on storage.objects;
drop policy if exists "own files write"  on storage.objects;
drop policy if exists "own files delete" on storage.objects;

create policy "own files read" on storage.objects
  for select using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "own files write" on storage.objects
  for insert with check (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "own files delete" on storage.objects
  for delete using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
