-- ============================================================
-- ALPHA — MIGRATION V7b (jalankan SETELAH v7a sukses)
-- Fitur Request Content oleh PM.
-- ============================================================

create table public.content_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  account_id uuid references public.accounts (id),
  requested_date date,
  note text,
  requester_id uuid references public.profiles (id),
  requester_name text,
  status text not null default 'pending',   -- pending / diangkat / ditolak
  created_content_id uuid references public.contents (id),
  created_at timestamptz not null default now()
);

alter table public.content_requests enable row level security;

-- Semua user aktif bisa melihat daftar request
create policy req_select on public.content_requests
  for select to authenticated using (public.my_role() is not null);

-- Request hanya oleh tim PM (atau manager/superadmin)
create policy req_insert on public.content_requests
  for insert to authenticated
  with check (
    (public.my_team() = 'pm' or public.is_privileged())
    and requester_id = auth.uid()
  );

-- Angkat/tolak: tim creative, delta, atau manager/superadmin
create policy req_update on public.content_requests
  for update to authenticated
  using (public.is_privileged() or public.my_team() in ('creative', 'delta'))
  with check (public.is_privileged() or public.my_team() in ('creative', 'delta'));

create policy req_delete on public.content_requests
  for delete to authenticated using (public.is_privileged());

grant select, insert, update, delete on public.content_requests to authenticated;

-- Log request masuk
create or replace function public.log_request_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_email text; v_name text;
begin
  select email, full_name into v_email, v_name from public.profiles where id = auth.uid();
  if tg_op = 'INSERT' then
    insert into public.activity_logs (actor_id, actor_email, actor_name, action, entity, entity_title, detail)
    values (auth.uid(), v_email, v_name, 'membuat', 'request', new.title,
            'Request konten' || coalesce(' · target ' || new.requested_date::text, ''));
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.activity_logs (actor_id, actor_email, actor_name, action, entity, entity_title, detail)
    values (auth.uid(), v_email, v_name, 'mengubah', 'request', new.title, 'Request ' || new.status);
  end if;
  return coalesce(new, old);
end;
$$;

create trigger requests_log
after insert or update on public.content_requests
for each row execute function public.log_request_change();

-- Cek cepat: select * from content_requests;
