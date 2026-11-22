-- =============================================================
--  Lab : à coller dans Supabase > SQL Editor > New query > Run
--  Crée la table des transferts, l'espace de stockage des fichiers
--  et les règles qui garantissent que chacun ne voit QUE ses données.
-- =============================================================

-- 1) Table des transferts
create table if not exists public.transfers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('text', 'file')),
  content     text,
  file_path   text,
  file_name   text,
  file_size   bigint,
  mime        text,
  device      text,
  created_at  timestamptz not null default now()
);

create index if not exists transfers_user_created_idx on public.transfers (user_id, created_at desc);

-- 2) Sécurité : chaque utilisateur n'accède qu'à ses propres lignes
alter table public.transfers enable row level security;

-- Accès réservé aux personnes connectées (rien pour les visiteurs anonymes)
revoke all on public.transfers from anon;
grant select, insert, delete on public.transfers to authenticated;

drop policy if exists "lire mes transferts"      on public.transfers;
drop policy if exists "ajouter mes transferts"   on public.transfers;
drop policy if exists "supprimer mes transferts" on public.transfers;

create policy "lire mes transferts" on public.transfers
  for select to authenticated using (user_id = auth.uid());
create policy "ajouter mes transferts" on public.transfers
  for insert to authenticated with check (user_id = auth.uid());
create policy "supprimer mes transferts" on public.transfers
  for delete to authenticated using (user_id = auth.uid());

-- 3) Mise à jour en direct (le PC voit arriver ce que le téléphone envoie)
do $$
begin
  alter publication supabase_realtime add table public.transfers;
exception when duplicate_object then null;
end $$;

-- 4) Espace de stockage privé pour les fichiers (50 Mo max par fichier)
insert into storage.buckets (id, name, public, file_size_limit)
values ('transfers', 'transfers', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- Chaque utilisateur range ses fichiers dans un dossier à son nom (son id)
drop policy if exists "lab lire mes fichiers"      on storage.objects;
drop policy if exists "lab ajouter mes fichiers"   on storage.objects;
drop policy if exists "lab supprimer mes fichiers" on storage.objects;

create policy "lab lire mes fichiers" on storage.objects
  for select to authenticated
  using (bucket_id = 'transfers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "lab ajouter mes fichiers" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'transfers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "lab supprimer mes fichiers" on storage.objects
  for delete to authenticated
  using (bucket_id = 'transfers' and (storage.foldername(name))[1] = auth.uid()::text);
