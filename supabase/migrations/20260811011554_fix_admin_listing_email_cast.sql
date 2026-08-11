-- 관리자 조회 함수 두 개가 호출될 때마다 실패하던 문제 수정.
--
-- auth.users.email은 character varying(255)인데 두 함수 모두 반환 타입을 text로
-- 선언했다. plpgsql의 RETURN QUERY는 반환 컬럼 타입을 엄격하게 검사하므로 매번
--   42804: structure of query does not match function result type
--   DETAIL: Returned type character varying(255) does not match expected type text
-- 로 예외가 났고, 호출부는 오류를 조용히 무시하고 빈 배열로 처리해 왔다. 그 결과
--   - 관리자 화면에서 모든 회원이 "소속 회사 없음"으로 보이고 (연결은 실제로 되어 있음)
--   - 가입 신청 대기 목록이 항상 비어 보였다
-- 함수 본문에서 email을 text로 명시적으로 캐스팅해 선언과 일치시킨다.

begin;

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
    select m.id, m.user_id, u.email::text, m.organization_id, o.name, m.role, m.status, m.created_at
    from organization_members m
    join auth.users u on u.id = m.user_id
    join organizations o on o.id = m.organization_id
    order by o.name, u.email;
end;
$$;

create or replace function list_pending_access_requests()
returns table (
  request_id uuid,
  user_email text,
  requested_organization_name text,
  requested_role org_role,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'only platform admins can list access requests';
  end if;
  return query
    select r.id, u.email::text, r.requested_organization_name, r.requested_role, r.created_at
    from organization_access_requests r
    join auth.users u on u.id = r.user_id
    where r.status = 'pending'
    order by r.created_at asc;
end;
$$;

revoke execute on function list_all_organization_members() from anon, public;
revoke execute on function list_pending_access_requests() from anon, public;
grant execute on function list_all_organization_members() to authenticated;
grant execute on function list_pending_access_requests() to authenticated;

commit;
