-- 회사 이해 -> 팀 설계 -> NCS 근거 JD v1.0/v1.1

begin;

create table organization_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  source_type text not null check (source_type in ('manual', 'pdf', 'text_file')),
  title text not null,
  raw_text text,
  storage_path text,
  mime_type text,
  file_size integer check (file_size is null or file_size >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table organization_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  version_no integer not null check (version_no > 0),
  summary text not null,
  structured_context jsonb not null default '{}'::jsonb,
  source_ids uuid[] not null default '{}',
  model text not null default 'gemini-3.6-flash',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, version_no)
);

alter table jd_versions
  add column version_major integer not null default 1 check (version_major > 0),
  add column version_minor integer not null default 0 check (version_minor >= 0),
  add column organization_profile_id uuid references organization_profiles(id) on delete set null,
  add column design_snapshot jsonb not null default '{}'::jsonb,
  add column revision_kind text not null default 'system_baseline'
    check (revision_kind in ('system_baseline', 'user_refinement', 'major_revision'));

create table role_ncs_mappings (
  id uuid primary key default gen_random_uuid(),
  team_role_id uuid not null references team_roles(id) on delete cascade,
  jd_version_id uuid not null references jd_versions(id) on delete cascade,
  ncs_competency_unit_id uuid not null references ncs_competency_units(id) on delete cascade,
  status text not null default 'accepted' check (status in ('suggested', 'accepted', 'excluded')),
  match_strength text not null default 'medium' check (match_strength in ('high', 'medium', 'low')),
  rationale text not null,
  matched_inputs jsonb not null default '[]'::jsonb,
  model text not null default 'gemini-3.6-flash',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (jd_version_id, ncs_competency_unit_id)
);

create table jd_validation_runs (
  id uuid primary key default gen_random_uuid(),
  jd_version_id uuid not null references jd_versions(id) on delete cascade,
  status text not null check (status in ('passed', 'passed_with_notes', 'needs_review')),
  coverage_score integer not null default 0 check (coverage_score between 0 and 100),
  summary text not null,
  findings jsonb not null default '[]'::jsonb,
  model text not null default 'gemini-3.6-flash',
  created_at timestamptz not null default now()
);

create index idx_organization_sources_org on organization_sources (organization_id, created_at desc);
create index idx_organization_profiles_org on organization_profiles (organization_id, version_no desc);
create index idx_role_ncs_mappings_role on role_ncs_mappings (team_role_id, status);
create index idx_role_ncs_mappings_version on role_ncs_mappings (jd_version_id, status);
create index idx_jd_validation_runs_version on jd_validation_runs (jd_version_id, created_at desc);

alter table organization_sources enable row level security;
alter table organization_profiles enable row level security;
alter table role_ncs_mappings enable row level security;
alter table jd_validation_runs enable row level security;

create policy "members manage organization sources" on organization_sources
  for all to authenticated
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

create policy "members manage organization profiles" on organization_profiles
  for all to authenticated
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

create policy "members manage role ncs mappings" on role_ncs_mappings
  for all to authenticated
  using (is_org_member((
    select t.organization_id from team_roles tr
    join teams t on t.id = tr.team_id
    where tr.id = role_ncs_mappings.team_role_id
  )))
  with check (is_org_member((
    select t.organization_id from team_roles tr
    join teams t on t.id = tr.team_id
    where tr.id = role_ncs_mappings.team_role_id
  )));

create policy "members manage jd validation runs" on jd_validation_runs
  for all to authenticated
  using (is_org_member((
    select t.organization_id from jd_versions jv
    join team_roles tr on tr.id = jv.team_role_id
    join teams t on t.id = tr.team_id
    where jv.id = jd_validation_runs.jd_version_id
  )))
  with check (is_org_member((
    select t.organization_id from jd_versions jv
    join team_roles tr on tr.id = jv.team_role_id
    join teams t on t.id = tr.team_id
    where jv.id = jd_validation_runs.jd_version_id
  )));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-sources',
  'company-sources',
  false,
  8388608,
  array['application/pdf', 'text/plain', 'text/markdown']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "members upload company sources" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'company-sources'
    and is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "members read company sources" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'company-sources'
    and is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "members update company sources" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'company-sources'
    and is_org_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'company-sources'
    and is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "members delete company sources" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'company-sources'
    and is_org_member(((storage.foldername(name))[1])::uuid)
  );

commit;
