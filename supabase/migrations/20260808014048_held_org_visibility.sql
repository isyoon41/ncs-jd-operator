-- 같은 이유로 organizations도 is_org_member(id) 기반 SELECT 정책만 있으면
-- 보류된 회원에게는 회사 이름조차 안 보인다(대시보드에서 "어느 회사가 보류됐는지"
-- 표시할 수 없게 됨). 실제 멤버십 행이 있으면(상태 무관) 최소한 이름은 보이게 한다.

begin;

create policy "members can view held organizations" on organizations
  for select using (
    exists (
      select 1 from organization_members
      where organization_id = organizations.id and user_id = auth.uid()
    )
  );

commit;
