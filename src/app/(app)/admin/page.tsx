import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/auth/session";
import { collectAllPages } from "@/lib/admin/paginate";
import { CompanyMembersPanel } from "@/components/admin/company-members-panel";
import { AccessRequestsPanel } from "@/components/admin/access-requests-panel";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

type AdminAuthUser = {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  email_confirmed_at: string | null;
  banned_until: string | null;
};

// Promise.all 안에서 실패가 다른 조회를 무너뜨리지 않도록 여기서 격리한다.
// listUsers는 페이지 단위 응답이라 마지막 페이지까지 읽어야 한다 — 한 페이지만 읽으면
// 기본 50명을 넘는 순간 나머지 회원이 오류 없이 목록에서 사라진다.
async function listAuthUsers(): Promise<{ users: AdminAuthUser[]; error: string | null }> {
  try {
    const admin = createAdminClient();
    // 페이지 종료 판정은 서버가 준 원본 개수로만 해야 한다. 여기서 걸러낸 뒤 세면
    // 이메일 없는 계정 때문에 페이지가 덜 찬 것처럼 보여 조기 종료된다.
    const rawUsers = await collectAllPages(async (page, perPage) => {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      return data.users;
    });

    const users = rawUsers
      .filter((authUser): authUser is typeof authUser & { email: string } => Boolean(authUser.email))
      .map((authUser) => {
        const displayName = authUser.user_metadata?.display_name;
        return {
          id: authUser.id,
          email: authUser.email,
          display_name: typeof displayName === "string" && displayName.trim() ? displayName : null,
          created_at: authUser.created_at,
          email_confirmed_at: authUser.email_confirmed_at ?? null,
          banned_until: authUser.banned_until ?? null,
        };
      });
    return { users, error: null };
  } catch (error) {
    return { users: [], error: error instanceof Error ? error.message : "회원 목록을 불러오지 못했습니다." };
  }
}

export default async function AdminPage() {
  // 레이아웃이 이미 조회한 값을 재사용한다 (React cache로 요청당 1회).
  const context = await getOrgContext();
  if (!context) redirect("/login");
  const { user, organizations, isSuperAdmin } = context;
  if (!isSuperAdmin) redirect("/");

  const organizationOptions = [...organizations]
    .map((organization) => ({ id: organization.id, name: organization.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const supabase = await createClient();
  const [{ data: pendingRequests }, { data: allMemberships }, { users: authUsers, error: membersError }] =
    await Promise.all([
      supabase.rpc("list_pending_access_requests"),
      supabase.rpc("list_all_organization_members"),
      listAuthUsers(),
    ]);

  return (
    <PageContainer>
      <PageHeader
        backHref="/"
        eyebrow="Platform admin"
        title="사용자 설정"
        description="회사를 만들고, 가입 신청을 승인·거절하고, 회사별 사용자와 역할을 관리합니다."
      />

      <div className="space-y-10">
        <AccessRequestsPanel initialAccessRequests={pendingRequests ?? []} organizations={organizationOptions} />

        {membersError ? (
          <p className="text-sm text-red-600">
            회원 목록을 불러오지 못했습니다: {membersError} (SUPABASE_SERVICE_ROLE_KEY 환경변수를 확인해 주세요)
          </p>
        ) : (
          <CompanyMembersPanel
            users={authUsers}
            memberships={allMemberships ?? []}
            organizations={organizationOptions}
            currentUserId={user.id}
          />
        )}
      </div>
    </PageContainer>
  );
}
