import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { JdRefineForm } from "@/components/jobs/jd-refine-form";

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/jobs/${id}/edit`);

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
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <Link href={`/jobs/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />v{version.version_major}.{version.version_minor}으로 돌아가기</Link>
        <header className="mb-8 mt-6 rounded-3xl bg-slate-950 p-7 text-white sm:p-9"><div className="flex items-center gap-2 text-blue-300"><RefreshCw className="h-4 w-4" /><p className="text-sm font-bold">Optional refinement · NCS re-validation</p></div><h1 className="mt-3 text-3xl font-black tracking-tight">직무기술서 v1.1 만들기</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{role.teams?.organizations?.name} · {role.teams?.name} · 자동 생성된 v1.0을 그대로 사용할 수도 있습니다. 회사 고유 정보를 더 반영하고 싶은 항목만 수정하면 Gemini가 NCS 근거를 다시 검토합니다.</p><div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold"><Sparkles className="h-3.5 w-3.5 text-blue-300" />기존 v1.0은 설계 스냅샷으로 보존됩니다</div></header>
        {hasNewerProfile && <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-800">회사 프로필이 v{usedProfileVersion} → v{latestOrgProfileVersion}로 업데이트되었습니다. 이번 v1.1 보완에는 최신 프로필이 반영됩니다.</div>}
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
      </div>
    </main>
  );
}
