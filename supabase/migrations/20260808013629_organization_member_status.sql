-- 회원 "보류"(회사 접근 임시 정지) 지원 + 관리자용 전체 회원 조회

begin;

alter table organization_members
  add column status text not null default 'active' check (status in ('active', 'held'));

create or replace function is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    exists (select 1 from platform_admins where user_id = auth.uid())
    or exists (
      select 1
      from organization_members
      where organization_id = target_org_id and user_id = auth.uid() and status = 'active'
    );
$$;

create or replace function is_org_admin(target_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    exists (select 1 from platform_admins where user_id = auth.uid())
    or exists (
      select 1
      from organization_members
      where organization_id = target_org_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
        and status = 'active'
    );
$$;

create or replace function list_all_organization_members()
returns table (
  member_id uuid,
  user_id uuid,
  user_email text,
  organization_id uuid,
  organization_name text,
  role org_role,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'only platform admins can list all members';
  end if;
  return query
    select m.id, m.user_id, u.email, m.organization_id, o.name, m.role, m.status, m.created_at
    from organization_members m
    join auth.users u on u.id = m.user_id
    join organizations o on o.id = m.organization_id
    order by o.name, u.email;
end;
$$;

revoke execute on function list_all_organization_members() from anon, public;
grant execute on function list_all_organization_members() to authenticated;

commit;
