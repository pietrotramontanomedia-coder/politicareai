-- Schema del profilo Politicare su Supabase.
-- Da eseguire una volta nel SQL editor del progetto (regione UE).
--
-- Regola non negoziabile: qui non esiste nessuna tabella per il test partiti.
-- Risposte e classifica del test restano sul dispositivo (GDPR art. 9, CLAUDE.md).

create table if not exists profili (
  id uuid primary key references auth.users on delete cascade,
  nome text not null default '',
  colore text not null default '#FEDC01',
  anno_nascita smallint check (anno_nascita between 1900 and extract(year from now())::int),
  citta text not null default '',
  temi_seguiti text[] not null default '{}',
  giocatori text[] not null default '{}',
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

create table if not exists storico_quiz (
  utente uuid not null references auth.users on delete cascade,
  numero int not null,
  percentuale int not null check (percentuale between 0 and 100),
  corrette int not null check (corrette >= 0),
  totale int not null check (totale > 0),
  migliore_percentuale int not null check (migliore_percentuale between 0 and 100),
  tentativi int not null default 1 check (tentativi > 0),
  completato_il timestamptz not null,
  primary key (utente, numero)
);

alter table profili enable row level security;
alter table storico_quiz enable row level security;

drop policy if exists "profilo del proprietario" on profili;
create policy "profilo del proprietario" on profili
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "quiz del proprietario" on storico_quiz;
create policy "quiz del proprietario" on storico_quiz
  for all using (auth.uid() = utente) with check (auth.uid() = utente);

-- Diritto all'oblio: l'utente cancella il proprio account; profilo e storico cadono in cascata.
create or replace function elimina_account()
returns void
language sql
security definer
set search_path = public, auth
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function elimina_account() from public;
grant execute on function elimina_account() to authenticated;
