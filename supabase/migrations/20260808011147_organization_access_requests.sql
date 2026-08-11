-- 초대 링크 없이 가입한 사용자를 위한 "가입 신청 -> 관리자 승인" 경로

begin;

create table organization_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_organization_name text not null,
  requested_role org_role not null default 'member',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  organization_id uuid references organizations(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_org_access_requests_status on organization_access_requests (status, created_at);
create index idx_org_access_requests_user on organization_access_requests (user_id);

alter table organization_access_requests enable row level security;

create policy "users view own access requests" on organization_access_requests
  for select using (user_id = auth.uid());

create policy "users create own access requests" on organization_access_requests
  for insert with check (user_id = auth.uid());

create policy "platform admins manage access requests" on organization_access_requests
  for all using (is_platform_admin()) with check (is_platform_admin());

create or replace function request_organization_access(company_name text, requested_role org_role default 'member')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated to request access';
  end if;
  if trim(company_name) = '' then
    raise exception 'company name is required';
  end if;

  insert into organization_access_requests (user_id, requested_organization_name, requested_role)
  values (auth.uid(), trim(company_name), requested_role)
  returning id into new_id;

  return new_id;
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
    select r.id, u.email, r.requested_organization_name, r.requested_role, r.created_at
    from organization_access_requests r
    join auth.users u on u.id = r.user_id
    where r.status = 'pending'
    order by r.created_at asc;
end;
$$;

create or replace function approve_access_request(request_id uuid, target_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req record;
begin
  if not is_platform_admin() then
    raise exception 'only platform admins can approve access requests';
  end if;

  select * into req from organization_access_requests where id = request_id and status = 'pending';
  if req is null then
    raise exception 'request not found or already reviewed';
  end if;

  insert into organization_members (organization_id, user_id, role)
  values (target_org_id, req.user_id, req.requested_role)
  on conflict (organization_id, user_id) do nothing;

  update organization_access_requests
  set status = 'approved', organization_id = target_org_id, reviewed_by = auth.uid(), reviewed_at = now()
  where id = request_id;
end;
$$;

create or replace function reject_access_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'only platform admins can reject access requests';
  end if;

  update organization_access_requests
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  where id = request_id and status = 'pending';
end;
$$;

revoke execute on function request_organization_access(text, org_role) from anon, public;
revoke execute on function list_pending_access_requests() from anon, public;
revoke execute on function approve_access_request(uuid, uuid) from anon, public;
revoke execute on function reject_access_request(uuid) from anon, public;

grant execute on function request_organization_access(text, org_role) to authenticated;
grant execute on function list_pending_access_requests() to authenticated;
grant execute on function approve_access_request(uuid, uuid) to authenticated;
grant execute on function reject_access_request(uuid) to authenticated;

commit;
