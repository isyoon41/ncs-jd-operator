-- 마스터 관리자 온보딩 모델 확정에 따른 정리
-- 1) 예전 셀프서비스 조직 생성 함수 제거 (이제 회사는 마스터 관리자만 생성)
-- 2) 관리자 전용 함수는 anon 역할의 실행 권한을 제거 (내부 is_platform_admin() 체크로도
--    이미 막혀 있지만, 최소권한 원칙에 따라 방어적으로 한 번 더 잠근다)
-- 3) citext 확장을 public 스키마 밖으로 이동

drop function if exists create_organization_with_owner(text, text);

revoke execute on function create_organization_as_admin(text, text) from anon, public;
revoke execute on function create_invite(uuid, org_role, integer) from anon, public;
revoke execute on function accept_invite(uuid) from anon, public;
revoke execute on function is_org_member(uuid) from anon, public;
revoke execute on function is_org_admin(uuid) from anon, public;
revoke execute on function is_platform_admin() from anon, public;

grant execute on function create_organization_as_admin(text, text) to authenticated;
grant execute on function create_invite(uuid, org_role, integer) to authenticated;
grant execute on function accept_invite(uuid) to authenticated;
grant execute on function is_org_member(uuid) to authenticated;
grant execute on function is_org_admin(uuid) to authenticated;
grant execute on function is_platform_admin() to authenticated;

-- get_invite_info는 비로그인 사용자도 초대 링크를 미리 볼 수 있어야 하므로 anon 실행 권한 유지

create schema if not exists extensions;
alter extension citext set schema extensions;
