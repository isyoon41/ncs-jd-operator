-- 마스터 관리자(플랫폼 운영자) + 회사 초대 링크 온보딩
-- 흐름: 마스터 관리자가 회사(organization)를 만들고 초대 링크를 발급 →
-- 사용자는 그 링크로만 회원가입해서 해당 회사에 자동으로 연결됨.
-- 일반 사용자는 회사를 직접 만들 수 없고, 초대 없이는 어떤 조직에도 속하지 못한다.

-- ---------------------------------------------------------------------------
-- 플랫폼 관리자
-- ---------------------------------------------------------------------------
create table platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table platform_admins enable row level security;
-- 일반/인증 사용자에게 어떤 정책도 부여하지 않음 — service_role(=Supabase MCP/서버)로만 관리

create or replace function is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from platform_admins where user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- 회사 초대 링크
-- ---------------------------------------------------------------------------
create table organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  role org_role not null default 'member',
  created_by uuid references auth.users(id) on delete set null,
  is_revoked boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_organization_invites_org on organization_invites (organization_id);

alter table organization_invites enable row level security;

create policy "platform admins manage invites" on organization_invites
  for all using (is_platform_admin()) with check (is_platform_admin());

-- ---------------------------------------------------------------------------
-- 플랫폼 관리자 전용: 회사 생성 (본인은 멤버로 추가되지 않음 — 초대 링크로만 계정 연결)
-- ---------------------------------------------------------------------------
create or replace function create_organization_as_admin(org_name text, org_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if not is_platform_admin() then
    raise exception 'only platform admins can create organizations';
  end if;

  insert into organizations (name, slug) values (org_name, org_slug) returning id into new_org_id;
  return new_org_id;
end;
$$;

-- 플랫폼 관리자 전용: 초대 링크 발급
create or replace function create_invite(target_org_id uuid, invite_role org_role default 'member', expires_in_days integer default null)
returns table (invite_id uuid, invite_token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  new_token uuid;
begin
  if not is_platform_admin() then
    raise exception 'only platform admins can create invites';
  end if;

  insert into organization_invites (organization_id, role, created_by, expires_at)
  values (
    target_org_id,
    invite_role,
    auth.uid(),
    case when expires_in_days is null then null else now() + make_interval(days => expires_in_days) end
  )
  returning id, token into new_id, new_token;

  invite_id := new_id;
  invite_token := new_token;
  return next;
end;
$$;

-- 누구나(비로그인 포함) 초대 링크 유효성과 회사명을 확인할 수 있는 함수 — 테이블 자체는 노출하지 않음
create or replace function get_invite_info(invite_token uuid)
returns table (organization_name text, role org_role, is_valid boolean)
language sql
security definer
stable
set search_path = public
as $$
  select
    o.name,
    i.role,
    (not i.is_revoked and (i.expires_at is null or i.expires_at > now())) as is_valid
  from organization_invites i
  join organizations o on o.id = i.organization_id
  where i.token = invite_token;
$$;

-- 로그인/가입 직후 호출: 초대 토큰으로 본인을 해당 회사 멤버로 연결
create or replace function accept_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite record;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated to accept an invite';
  end if;

  select * into invite from organization_invites where token = invite_token;

  if invite is null then
    raise exception 'invalid invite token';
  end if;
  if invite.is_revoked then
    raise exception 'invite has been revoked';
  end if;
  if invite.expires_at is not null and invite.expires_at <= now() then
    raise exception 'invite has expired';
  end if;

  insert into organization_members (organization_id, user_id, role)
  values (invite.organization_id, auth.uid(), invite.role)
  on conflict (organization_id, user_id) do nothing;

  return invite.organization_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- organizations: 플랫폼 관리자는 전체 조회/관리 가능 (기존 "멤버만 조회" 정책은 유지)
-- ---------------------------------------------------------------------------
create policy "platform admins manage organizations" on organizations
  for all using (is_platform_admin()) with check (is_platform_admin());
