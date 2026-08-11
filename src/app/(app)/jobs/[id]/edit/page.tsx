import { notFound, redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/auth/session";
import type { Json } from "@/lib/supabase/database.types";
import { JdRefineForm } from "@/components/jobs/jd-refine-form";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

export const maxDuration = 300;

function record(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function strings(value: Json | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function roleTitles(value: Json | undefined): string[] {
  return Array.isArray(value) ? value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    return typeof item.title === "string" ? [item.title] : [];
  }) : [];
}

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getOrgContext();
  if (!context) redirect(`/login?next=/jobs/${id}/edit`);

  const supabase = await createClient();
  const { data: role } = await supabase
    .from("team_roles")
    .select("id, title, intake, teams(name, mission, charter, organization_id, organizations(name)), jd_versions(version_no, version_major, version_minor, design_snapshot, organization_profile_id, organization_profiles(version_no), jd_sections(kind, position, content, metadata))")
    .eq("id", id)
    .order("version_no", { referencedTable: "jd_versions", ascending: false })
    .limit(1, { referencedTable: "jd_versions" })
    .maybeSingle();
  if (!role || !role.jd_versions[0]) notFound();
  const version = role.jd_versions[0];
  if (version.version_major === 1 && version.version_minor >= 1) redirect(`/jobs/${id}`);

  const organization = context.organizations.find((item) => item.id === role.teams?.organization_id);
  const canManage = organization ? organization.memberRole !== "member" : false;

  const { data: latestOrgProfiles } = role.teams?.organization_id
    ? await supabase
        .from("organization_profiles")
        .select("version_no")
        .eq("organization_id", role.teams.organization_id)
        .order("version_no", { ascending: false })
        .limit(1)
    : { data: [] };
  const latestOrgProfileVersion = latestOrgProfiles?.[0]?.version_no ?? null;
  const usedProfileVersion = version.organization_profiles?.version_no ?? null;
  const hasNewerProfile = Boolean(
    latestOrgProfileVersion && usedProfileVersion && latestOrgProfileVersion > usedProfileVersion,
  );
  const sections = [...version.jd_sections].sort((a, b) => a.position - b.position);
  const byKind = (kind: typeof sections[number]["kind"]) => sections.filter((section) => section.kind === kind).map((section) => section.content);
  const snapshot = record(version.design_snapshot);
  const primaryRole = record(snapshot.primaryRole ?? {});
  const intake = record(role.intake);
  const teamCharter = record(role.teams?.charter ?? {});

  return (
    <PageContainer>
      <PageHeader
        backHref={`/jobs/${id}`}
        backLabel={`v${version.version_major}.${version.version_minor}으로 돌아가기`}
        eyebrow="Optional refinement · NCS re-validation"
        title="직무기술서 v1.1 만들기"
        description={`${role.teams?.organizations?.name} · ${role.teams?.name} · 자동 생성된 v1.0을 그대로 사용할 수도 있습니다. 회사 고유 정보를 더 반영하고 싶은 항목만 수정하면 Gemini가 NCS 근거를 다시 검토합니다.`}
        action={
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
            <Sparkles className="h-3.5 w-3.5" />
            기존 v1.0은 설계 스냅샷으로 보존됩니다
          </span>
        }
      />
      {hasNewerProfile && <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-800">회사 프로필이 v{usedProfileVersion} → v{latestOrgProfileVersion}로 업데이트되었습니다. 이번 v1.1 보완에는 최신 프로필이 반영됩니다.</div>}
      {canManage ? (
        <JdRefineForm roleId={id} content={{
          teamMission: typeof snapshot.teamMission === "string" ? snapshot.teamMission : role.teams?.mission ?? "",
          teamOutputs: strings(snapshot.teamOutputs ?? teamCharter.outputs),
          teamResponsibilities: strings(snapshot.teamResponsibilities ?? teamCharter.responsibilities),
          suggestedRoles: roleTitles(snapshot.suggestedRoles ?? teamCharter.suggestedRoles),
          roleTitle: typeof primaryRole.title === "string" ? primaryRole.title : role.title,
          mission: byKind("mission")[0] ?? "",
          outputs: strings(primaryRole.outputs ?? intake.outputs),
          responsibilities: byKind("responsibility"),
          requiredQualifications: byKind("qualification_required"),
          preferredQualifications: byKind("qualification_preferred"),
          tools: strings(primaryRole.tools ?? intake.tools),
          stakeholders: strings(primaryRole.stakeholders ?? intake.stakeholders),
          kpis: byKind("kpi"),
        }} />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h3 className="font-bold text-slate-800">직무설계 보완 권한이 없습니다</h3>
          <p className="mt-2 text-sm text-slate-400">v1.1 보완은 관리자만 할 수 있습니다.</p>
        </div>
      )}
    </PageContainer>
  );
}
