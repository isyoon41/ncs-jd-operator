-- 회사 프로필/JD/팀 관련 정책을 전부 "조회는 소속만 있으면, 쓰기는 admin 이상만"으로 쪼갠다.
-- 지금까지는 is_org_member() 하나로 select/insert/update/delete를 전부 허용했기 때문에
-- role이 'member'여도 회사 프로필을 고치거나 JD를 만들고 지울 수 있었다.
-- is_org_admin()은 role in ('owner','admin')이거나 platform_admins에 있으면 true다
-- (organization_member_status.sql 참고) — 'owner'는 지금 아무도 안 쓰지만 admin과 동일하게 취급된다.

begin;

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------
drop policy "members can manage teams" on teams;
create policy "admins can insert teams" on teams
  for insert with check (is_org_admin(organization_id));
create policy "admins can update teams" on teams
  for update using (is_org_admin(organization_id)) with check (is_org_admin(organization_id));
create policy "admins can delete teams" on teams
  for delete using (is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- team_roles
-- ---------------------------------------------------------------------------
drop policy "members can manage team_roles" on team_roles;
create policy "admins can insert team_roles" on team_roles
  for insert with check (is_org_admin((select organization_id from teams where teams.id = team_roles.team_id)));
create policy "admins can update team_roles" on team_roles
  for update
  using (is_org_admin((select organization_id from teams where teams.id = team_roles.team_id)))
  with check (is_org_admin((select organization_id from teams where teams.id = team_roles.team_id)));
create policy "admins can delete team_roles" on team_roles
  for delete using (is_org_admin((select organization_id from teams where teams.id = team_roles.team_id)));

-- ---------------------------------------------------------------------------
-- jd_versions
-- ---------------------------------------------------------------------------
drop policy "members can manage jd_versions" on jd_versions;
create policy "admins can insert jd_versions" on jd_versions
  for insert with check (is_org_admin((
    select t.organization_id from team_roles tr join teams t on t.id = tr.team_id where tr.id = jd_versions.team_role_id
  )));
create policy "admins can update jd_versions" on jd_versions
  for update
  using (is_org_admin((
    select t.organization_id from team_roles tr join teams t on t.id = tr.team_id where tr.id = jd_versions.team_role_id
  )))
  with check (is_org_admin((
    select t.organization_id from team_roles tr join teams t on t.id = tr.team_id where tr.id = jd_versions.team_role_id
  )));
create policy "admins can delete jd_versions" on jd_versions
  for delete using (is_org_admin((
    select t.organization_id from team_roles tr join teams t on t.id = tr.team_id where tr.id = jd_versions.team_role_id
  )));

-- ---------------------------------------------------------------------------
-- jd_sections
-- ---------------------------------------------------------------------------
drop policy "members can manage jd_sections" on jd_sections;
create policy "admins can insert jd_sections" on jd_sections
  for insert with check (is_org_admin((
    select t.organization_id from jd_versions jv
      join team_roles tr on tr.id = jv.team_role_id
      join teams t on t.id = tr.team_id
    where jv.id = jd_sections.jd_version_id
  )));
create policy "admins can update jd_sections" on jd_sections
  for update
  using (is_org_admin((
    select t.organization_id from jd_versions jv
      join team_roles tr on tr.id = jv.team_role_id
      join teams t on t.id = tr.team_id
    where jv.id = jd_sections.jd_version_id
  )))
  with check (is_org_admin((
    select t.organization_id from jd_versions jv
      join team_roles tr on tr.id = jv.team_role_id
      join teams t on t.id = tr.team_id
    where jv.id = jd_sections.jd_version_id
  )));
create policy "admins can delete jd_sections" on jd_sections
  for delete using (is_org_admin((
    select t.organization_id from jd_versions jv
      join team_roles tr on tr.id = jv.team_role_id
      join teams t on t.id = tr.team_id
    where jv.id = jd_sections.jd_version_id
  )));

-- ---------------------------------------------------------------------------
-- jd_evidence
-- ---------------------------------------------------------------------------
drop policy "members can manage jd_evidence" on jd_evidence;
create policy "admins can insert jd_evidence" on jd_evidence
  for insert with check (is_org_admin((
    select t.organization_id from jd_sections js
      join jd_versions jv on jv.id = js.jd_version_id
      join team_roles tr on tr.id = jv.team_role_id
      join teams t on t.id = tr.team_id
    where js.id = jd_evidence.jd_section_id
  )));
create policy "admins can update jd_evidence" on jd_evidence
  for update
  using (is_org_admin((
    select t.organization_id from jd_sections js
      join jd_versions jv on jv.id = js.jd_version_id
      join team_roles tr on tr.id = jv.team_role_id
      join teams t on t.id = tr.team_id
    where js.id = jd_evidence.jd_section_id
  )))
  with check (is_org_admin((
    select t.organization_id from jd_sections js
      join jd_versions jv on jv.id = js.jd_version_id
      join team_roles tr on tr.id = jv.team_role_id
      join teams t on t.id = tr.team_id
    where js.id = jd_evidence.jd_section_id
  )));
create policy "admins can delete jd_evidence" on jd_evidence
  for delete using (is_org_admin((
    select t.organization_id from jd_sections js
      join jd_versions jv on jv.id = js.jd_version_id
      join team_roles tr on tr.id = jv.team_role_id
      join teams t on t.id = tr.team_id
    where js.id = jd_evidence.jd_section_id
  )));

-- ---------------------------------------------------------------------------
-- uploaded_jds (앱에서 아직 안 쓰지만 스키마상 존재하므로 같이 정리)
-- ---------------------------------------------------------------------------
drop policy "members can manage uploaded_jds" on uploaded_jds;
create policy "admins can insert uploaded_jds" on uploaded_jds
  for insert with check (is_org_admin(organization_id));
create policy "admins can update uploaded_jds" on uploaded_jds
  for update using (is_org_admin(organization_id)) with check (is_org_admin(organization_id));
create policy "admins can delete uploaded_jds" on uploaded_jds
  for delete using (is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- organization_sources
-- ---------------------------------------------------------------------------
drop policy "members manage organization sources" on organization_sources;
create policy "members can view organization sources" on organization_sources
  for select to authenticated using (is_org_member(organization_id));
create policy "admins can insert organization sources" on organization_sources
  for insert to authenticated with check (is_org_admin(organization_id));
create policy "admins can update organization sources" on organization_sources
  for update to authenticated using (is_org_admin(organization_id)) with check (is_org_admin(organization_id));
create policy "admins can delete organization sources" on organization_sources
  for delete to authenticated using (is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- organization_profiles
-- ---------------------------------------------------------------------------
drop policy "members manage organization profiles" on organization_profiles;
create policy "members can view organization profiles" on organization_profiles
  for select to authenticated using (is_org_member(organization_id));
create policy "admins can insert organization profiles" on organization_profiles
  for insert to authenticated with check (is_org_admin(organization_id));
create policy "admins can update organization profiles" on organization_profiles
  for update to authenticated using (is_org_admin(organization_id)) with check (is_org_admin(organization_id));
create policy "admins can delete organization profiles" on organization_profiles
  for delete to authenticated using (is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- role_ncs_mappings
-- ---------------------------------------------------------------------------
drop policy "members manage role ncs mappings" on role_ncs_mappings;
create policy "members can view role ncs mappings" on role_ncs_mappings
  for select to authenticated using (is_org_member((
    select t.organization_id from team_roles tr
    join teams t on t.id = tr.team_id
    where tr.id = role_ncs_mappings.team_role_id
  )));
create policy "admins can insert role ncs mappings" on role_ncs_mappings
  for insert to authenticated with check (is_org_admin((
    select t.organization_id from team_roles tr
    join teams t on t.id = tr.team_id
    where tr.id = role_ncs_mappings.team_role_id
  )));
create policy "admins can update role ncs mappings" on role_ncs_mappings
  for update to authenticated
  using (is_org_admin((
    select t.organization_id from team_roles tr
    join teams t on t.id = tr.team_id
    where tr.id = role_ncs_mappings.team_role_id
  )))
  with check (is_org_admin((
    select t.organization_id from team_roles tr
    join teams t on t.id = tr.team_id
    where tr.id = role_ncs_mappings.team_role_id
  )));
create policy "admins can delete role ncs mappings" on role_ncs_mappings
  for delete to authenticated using (is_org_admin((
    select t.organization_id from team_roles tr
    join teams t on t.id = tr.team_id
    where tr.id = role_ncs_mappings.team_role_id
  )));

-- ---------------------------------------------------------------------------
-- jd_validation_runs
-- ---------------------------------------------------------------------------
drop policy "members manage jd validation runs" on jd_validation_runs;
create policy "members can view jd validation runs" on jd_validation_runs
  for select to authenticated using (is_org_member((
    select t.organization_id from jd_versions jv
    join team_roles tr on tr.id = jv.team_role_id
    join teams t on t.id = tr.team_id
    where jv.id = jd_validation_runs.jd_version_id
  )));
create policy "admins can insert jd validation runs" on jd_validation_runs
  for insert to authenticated with check (is_org_admin((
    select t.organization_id from jd_versions jv
    join team_roles tr on tr.id = jv.team_role_id
    join teams t on t.id = tr.team_id
    where jv.id = jd_validation_runs.jd_version_id
  )));
create policy "admins can update jd validation runs" on jd_validation_runs
  for update to authenticated
  using (is_org_admin((
    select t.organization_id from jd_versions jv
    join team_roles tr on tr.id = jv.team_role_id
    join teams t on t.id = tr.team_id
    where jv.id = jd_validation_runs.jd_version_id
  )))
  with check (is_org_admin((
    select t.organization_id from jd_versions jv
    join team_roles tr on tr.id = jv.team_role_id
    join teams t on t.id = tr.team_id
    where jv.id = jd_validation_runs.jd_version_id
  )));
create policy "admins can delete jd validation runs" on jd_validation_runs
  for delete to authenticated using (is_org_admin((
    select t.organization_id from jd_versions jv
    join team_roles tr on tr.id = jv.team_role_id
    join teams t on t.id = tr.team_id
    where jv.id = jd_validation_runs.jd_version_id
  )));

-- ---------------------------------------------------------------------------
-- storage.objects (company-sources 버킷) — select는 유지, 쓰기만 admin
-- ---------------------------------------------------------------------------
drop policy "members upload company sources" on storage.objects;
drop policy "members update company sources" on storage.objects;
drop policy "members delete company sources" on storage.objects;

create policy "admins upload company sources" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'company-sources'
    and is_org_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "admins update company sources" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'company-sources'
    and is_org_admin(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'company-sources'
    and is_org_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "admins delete company sources" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'company-sources'
    and is_org_admin(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- ai_generation_events — 생성을 트리거하는 것도 쓰기 행위이므로 admin만
-- ---------------------------------------------------------------------------
drop policy "members insert own generation events" on ai_generation_events;
create policy "admins insert own generation events" on ai_generation_events
  for insert to authenticated
  with check (is_org_admin(organization_id) and user_id = auth.uid());

commit;
