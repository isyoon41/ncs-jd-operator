-- Gemini 파이프라인 호출 레이트리밋을 위한 이벤트 로그

begin;

create table ai_generation_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('create', 'refine')),
  created_at timestamptz not null default now()
);

create index idx_ai_generation_events_org on ai_generation_events (organization_id, created_at desc);
create index idx_ai_generation_events_user on ai_generation_events (user_id, created_at desc);

alter table ai_generation_events enable row level security;

create policy "members insert own generation events" on ai_generation_events
  for insert to authenticated
  with check (is_org_member(organization_id) and user_id = auth.uid());

create policy "members read organization generation events" on ai_generation_events
  for select to authenticated
  using (is_org_member(organization_id));

commit;
