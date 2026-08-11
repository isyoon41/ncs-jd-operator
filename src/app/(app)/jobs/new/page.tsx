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

  const supabase = await createClient();
  const { data: profileRows } = await supabase
    .from("organization_profiles")
    .select("organization_id, version_no, summary")
    .in("organization_id", organizations.map((organization) => organization.id))
    .order("version_no", { ascending: false });
  const profiles = [...new Map((profileRows ?? []).map((profile) => [profile.organization_id, profile])).values()];

  return (
    <PageContainer wide>
      <PageHeader
        backHref="/"
        eyebrow="Company-grounded job design"
        title="회사 이해에서 시작하는 직무설계"
        description="회사 소개자료와 간단한 팀 역할만 알려주세요. Gemini가 회사를 이해하고 NCS로 근거를 검토해 바로 사용할 수 있는 직무기술서 v1.0을 만듭니다."
      />
      <JdCreateForm organizations={organizations} profiles={profiles} defaultOrganizationId={activeOrgId} />
    </PageContainer>
  );
}
