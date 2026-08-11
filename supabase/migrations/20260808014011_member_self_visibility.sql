-- 00008에서 is_org_member가 status='active'를 요구하게 되면서, 보류된 회원은
-- "members can view fellow members" 정책(is_org_member 기반)으로 자기 자신의
-- organization_members 행조차 못 보게 됐다. 본인 행은 상태와 무관하게 항상 보이게 한다.

begin;

create policy "users view own membership" on organization_members
  for select using (user_id = auth.uid());

commit;
