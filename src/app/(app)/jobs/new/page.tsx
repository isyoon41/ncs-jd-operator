import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/auth/session";
import { JdCreateForm } from "@/components/jobs/jd-create-form";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

export const maxDuration = 300;

export default async function NewJobPage() {
  const context = await getOrgContext();
  if (!context) redirect("/login?next=/jobs/new");
  const { organizations, activeOrgId } = context;
  if (organizations.length === 0) redirect("/");

  // JD 생성은 관리자만 할 수 있다 — 일반 사용자가 소속된 회사는 선택지에서 뺀다.
  const manageableOrganizations = organizations.filter((organization) => organization.memberRole !== "member");

  const supabase = await createClient();
  const { data: profileRows } = manageableOrganizations.length
    ? await supabase
        .from("organization_profiles")
        .select("organization_id, version_no, summary")
        .in("organization_id", manageableOrganizations.map((organization) => organization.id))
        .order("version_no", { ascending: false })
    : { data: [] };
  const profiles = [...new Map((profileRows ?? []).map((profile) => [profile.organization_id, profile])).values()];
  const defaultOrganizationId = manageableOrganizations.some((organization) => organization.id === activeOrgId)
    ? activeOrgId
    : undefined;

  return (
    <PageContainer wide>
      <PageHeader
        backHref="/"
        eyebrow="Company-grounded job design"
        title="회사 이해에서 시작하는 직무설계"
        description="회사 소개자료와 간단한 팀 역할만 알려주세요. Gemini가 회사를 이해하고 NCS로 근거를 검토해 바로 사용할 수 있는 직무기술서 v1.0을 만듭니다."
      />
      {manageableOrganizations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h3 className="font-bold text-slate-800">직무설계 생성 권한이 없습니다</h3>
          <p className="mt-2 text-sm text-slate-400">새 직무설계를 만들려면 관리자에게 역할 변경을 요청해 주세요.</p>
        </div>
      ) : (
        <JdCreateForm organizations={manageableOrganizations} profiles={profiles} defaultOrganizationId={defaultOrganizationId} />
      )}
    </PageContainer>
  );
}
