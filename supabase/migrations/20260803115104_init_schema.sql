-- NCS 기반 직무기술서 생성기 — 초기 스키마
-- 스타트업 인사팀용 MVP: 회사(조직) 하나가 여러 팀/직무를 관리하고,
-- 팀 미션·R&R, 개인별 JD 초안, 기존 JD 업로드 개선, 통합 뷰(미션-R&R-자격요건-KPI)를 지원한다.

create extension if not exists pgcrypto;
create extension if not exists citext;

create type org_role as enum ('owner', 'admin', 'member');
create type jd_status as enum ('draft', 'in_review', 'approved', 'archived');
create type jd_section_kind as enum ('mission', 'responsibility', 'qualification_required', 'qualification_preferred', 'kpi');
create type evidence_source as enum ('ncs', 'user_input', 'uploaded_jd');

-- ---------------------------------------------------------------------------
-- 조직 / 멤버십
-- ---------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext not null unique,
  created_at timestamptz not null default now()
);

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- 회원가입 직후 조직 생성 + 본인을 owner로 등록하는 원자적 헬퍼 (RLS 선후관계 문제 회피)
create or replace function create_organization_with_owner(org_name text, org_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  insert into organizations (name, slug) values (org_name, org_slug) returning id into new_org_id;
  insert into organization_members (organization_id, user_id, role) values (new_org_id, auth.uid(), 'owner');
  return new_org_id;
end;
$$;

create or replace function is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from organization_members
    where organization_id = target_org_id and user_id = auth.uid()
  );
$$;

create or replace function is_org_admin(target_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from organization_members
    where organization_id = target_org_id and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- 팀 / 직무(팀 내 포지션)
-- ---------------------------------------------------------------------------
create table teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  mission text, -- AI가 생성한 팀 미션
  charter jsonb not null default '{}'::jsonb, -- 회사 특성, R&R 입력값 등
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table team_roles (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  title text not null,
  seniority_hint text,
  intake jsonb not null default '{}'::jsonb, -- 사용자가 입력한 미션/과업/도구 등 초안 정보
  status jd_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- NCS 참조 데이터 캐시 (전역, 조직 스코프 아님 — 서버 사이드 동기화로만 기록)
-- ---------------------------------------------------------------------------
create table ncs_competency_units (
  id uuid primary key default gen_random_uuid(),
  ncs_code text not null unique, -- 능력단위코드 (예: 1501020207_14v2)
  name text not null, -- 능력단위명
  level text, -- 능력단위수준
  definition text, -- 능력단위정의
  lclas_name text,
  mclas_name text,
  sclas_name text,
  subd_name text,
  synced_at timestamptz not null default now()
);

create table ncs_qualifications (
  id uuid primary key default gen_random_uuid(),
  ncs_competency_unit_id uuid references ncs_competency_units(id) on delete cascade,
  jm_cd text not null, -- 자격 종목코드
  jm_nm text not null, -- 종목명
  ablt_unit_typ_nm text, -- 필수 | 선택
  min_edu_trng_tm integer,
  synced_at timestamptz not null default now(),
  unique (ncs_competency_unit_id, jm_cd)
);

-- ---------------------------------------------------------------------------
-- JD 버전 / 섹션 / 근거
-- ---------------------------------------------------------------------------
create table jd_versions (
  id uuid primary key default gen_random_uuid(),
  team_role_id uuid not null references team_roles(id) on delete cascade,
  version_no integer not null check (version_no > 0),
  status jd_status not null default 'draft',
  source evidence_source not null default 'ncs',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (team_role_id, version_no)
);

create table jd_sections (
  id uuid primary key default gen_random_uuid(),
  jd_version_id uuid not null references jd_versions(id) on delete cascade,
  kind jd_section_kind not null,
  position integer not null default 0,
  content text not null,
  metadata jsonb not null default '{}'::jsonb, -- kpi: metric_type/formula/target 등
  created_at timestamptz not null default now()
);

create table jd_evidence (
  id uuid primary key default gen_random_uuid(),
  jd_section_id uuid not null references jd_sections(id) on delete cascade,
  source evidence_source not null,
  ncs_competency_unit_id uuid references ncs_competency_units(id) on delete set null,
  snippet text,
  confidence numeric(5,4) check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 기존 JD 업로드 → NCS 기반 개선 제안
-- ---------------------------------------------------------------------------
create table uploaded_jds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  team_role_id uuid references team_roles(id) on delete set null,
  raw_text text not null,
  suggestions jsonb, -- AI가 생성한 섹션별 개선 제안
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 인덱스
-- ---------------------------------------------------------------------------
create index idx_org_members_user on organization_members (user_id);
create index idx_teams_org on teams (organization_id);
create index idx_team_roles_team on team_roles (team_id);
create index idx_jd_versions_role on jd_versions (team_role_id, version_no desc);
create index idx_jd_sections_version on jd_sections (jd_version_id, position);
create index idx_jd_evidence_section on jd_evidence (jd_section_id);
create index idx_uploaded_jds_org on uploaded_jds (organization_id, created_at desc);
create index idx_ncs_qualifications_unit on ncs_qualifications (ncs_competency_unit_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table teams enable row level security;
alter table team_roles enable row level security;
alter table jd_versions enable row level security;
alter table jd_sections enable row level security;
alter table jd_evidence enable row level security;
alter table uploaded_jds enable row level security;
alter table ncs_competency_units enable row level security;
alter table ncs_qualifications enable row level security;

create policy "members can view their organizations" on organizations
  for select using (is_org_member(id));

create policy "members can view fellow members" on organization_members
  for select using (is_org_member(organization_id));
create policy "admins can manage membership" on organization_members
  for all using (is_org_admin(organization_id)) with check (is_org_admin(organization_id));

create policy "members can view teams" on teams
  for select using (is_org_member(organization_id));
create policy "members can manage teams" on teams
  for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));

create policy "members can view team_roles" on team_roles
  for select using (is_org_member((select organization_id from teams where teams.id = team_roles.team_id)));
create policy "members can manage team_roles" on team_roles
  for all
  using (is_org_member((select organization_id from teams where teams.id = team_roles.team_id)))
  with check (is_org_member((select organization_id from teams where teams.id = team_roles.team_id)));

create policy "members can view jd_versions" on jd_versions
  for select using (is_org_member((
    select t.organization_id from team_roles tr join teams t on t.id = tr.team_id where tr.id = jd_versions.team_role_id
  )));
create policy "members can manage jd_versions" on jd_versions
  for all
  using (is_org_member((
    select t.organization_id from team_roles tr join teams t on t.id = tr.team_id where tr.id = jd_versions.team_role_id
  )))
  with check (is_org_member((
    select t.organization_id from team_roles tr join teams t on t.id = tr.team_id where tr.id = jd_versions.team_role_id
  )));

create policy "members can view jd_sections" on jd_sections
  for select using (is_org_member((
    select t.organization_id from jd_versions jv
      join team_roles tr on tr.id = jv.team_role_id
      join teams t on t.id = tr.team_id
    where jv.id = jd_sections.jd_version_id
  )));
create policy "members can manage jd_sections" on jd_sections
  for all
  using (is_org_member((
    select t.organization_id from jd_versions jv
      join team_roles tr on tr.id = jv.team_role_id
      join teams t on t.id = tr.team_id
    where jv.id = jd_sections.jd_version_id
  )))
  with check (is_org_member((
    select t.organization_id from jd_versions jv
      join team_roles tr on tr.id = jv.team_role_id
      join teams t on t.id = tr.team_id
    where jv.id = jd_sections.jd_version_id
  )));

create policy "members can view jd_evidence" on jd_evidence
  for select using (is_org_member((
    select t.organization_id from jd_sections js
      join jd_versions jv on jv.id = js.jd_version_id
      join team_roles tr on tr.id = jv.team_role_id
      join teams t on t.id = tr.team_id
    where js.id = jd_evidence.jd_section_id
  )));
create policy "members can manage jd_evidence" on jd_evidence
  for all
  using (is_org_member((
    select t.organization_id from jd_sections js
      join jd_versions jv on jv.id = js.jd_version_id
      join team_roles tr on tr.id = jv.team_role_id
      join teams t on t.id = tr.team_id
    where js.id = jd_evidence.jd_section_id
  )))
  with check (is_org_member((
    select t.organization_id from jd_sections js
      join jd_versions jv on jv.id = js.jd_version_id
      join team_roles tr on tr.id = jv.team_role_id
      join teams t on t.id = tr.team_id
    where js.id = jd_evidence.jd_section_id
  )));

create policy "members can view uploaded_jds" on uploaded_jds
  for select using (is_org_member(organization_id));
create policy "members can manage uploaded_jds" on uploaded_jds
  for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));

-- NCS 참조 데이터: 로그인한 사용자 누구나 읽기 가능, 쓰기는 service role(서버 동기화)만
create policy "authenticated can read ncs_competency_units" on ncs_competency_units
  for select using (auth.role() = 'authenticated');
create policy "authenticated can read ncs_qualifications" on ncs_qualifications
  for select using (auth.role() = 'authenticated');
