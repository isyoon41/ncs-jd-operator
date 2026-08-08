import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { MembersPanel } from "@/components/admin/members-panel";
import { AccessRequestsPanel } from "@/components/admin/access-requests-panel";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (!isAdmin) redirect("/");

  const { data: organizations } = await supabase
    .from("organizations")
    .select(
      "id, name, slug, created_at, organization_invites(id, token, role, is_revoked, expires_at, created_at)"
    )
    .order("created_at", { ascending: false });
  const organizationOptions = (organizations ?? []).map((org) => ({ id: org.id, name: org.name }));

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  const { data: pendingRequests } = await supabase.rpc("list_pending_access_requests");
  const { data: allMemberships } = await supabase.rpc("list_all_organization_members");

  let authUsers: { id: string; email: string; created_at: string; email_confirmed_at: string | null; banned_until: string | null }[] = [];
  let membersError: string | null = null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers();
    if (error) throw error;
    authUsers = data.users
      .filter((authUser): authUser is typeof authUser & { email: string } => Boolean(authUser.email))
      .map((authUser) => ({
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        email_confirmed_at: authUser.email_confirmed_at ?? null,
        banned_until: authUser.banned_until ?? null,
      }));
  } catch (error) {
    membersError = error instanceof Error ? error.message : "회원 목록을 불러오지 못했습니다.";
  }

  return (
    <PageContainer>
      <PageHeader
        backHref="/"
        eyebrow="Platform admin"
        title="마스터 관리자"
        description="가입 신청 승인, 회원 관리, 회사·초대 운영을 한 곳에서 처리하세요."
      />

      <div className="space-y-10">
        <AccessRequestsPanel initialAccessRequests={pendingRequests ?? []} organizations={organizationOptions} />

        {membersError ? (
          <p className="text-sm text-red-600">회원 목록을 불러오지 못했습니다: {membersError} (SUPABASE_SERVICE_ROLE_KEY 환경변수를 확인해 주세요)</p>
        ) : (
          <MembersPanel users={authUsers} memberships={allMemberships ?? []} organizations={organizationOptions} currentUserId={user.id} />
        )}

        <AdminDashboard
          initialOrganizations={organizations ?? []}
          memberOrganizationIds={(memberships ?? []).map((item) => item.organization_id)}
          isSuperAdmin={Boolean(isAdmin)}
        />
      </div>
    </PageContainer>
  );
}
