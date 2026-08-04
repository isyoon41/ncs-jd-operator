-- 플랫폼 슈퍼관리자는 현재 및 미래의 모든 조직을 운영할 수 있다.
-- 실제 organization_members 행을 조직마다 복제하지 않고 권한 헬퍼에서 전역 접근을 부여한다.
-- 일반 사용자의 초대 기반 가입과 조직별 RLS 격리는 그대로 유지된다.

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
  select
    exists (select 1 from platform_admins where user_id = auth.uid())
    or exists (
      select 1
      from organization_members
      where organization_id = target_org_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    );
$$;

revoke execute on function is_org_member(uuid) from anon, public;
revoke execute on function is_org_admin(uuid) from anon, public;
grant execute on function is_org_member(uuid) to authenticated;
grant execute on function is_org_admin(uuid) to authenticated;
