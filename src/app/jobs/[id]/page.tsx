import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FileCheck2,
  FileText,
  Gauge,
  Network,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

const labels = {
  mission: "직무 미션",
  responsibility: "주요 책임",
  qualification_required: "필수 자격요건",
  qualification_preferred: "우대 자격요건",
  kpi: "핵심 성과지표",
} as const;

function record(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function strings(value: Json | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function objectList(value: Json | undefined): Array<Record<string, Json | undefined>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, Json | undefined> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function textField(value: Json | undefined) {
  return typeof value === "string" ? value : null;
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/jobs/${id}`);

  const { data: role } = await supabase
    .from("team_roles")
    .select("id, title, seniority_hint, status, intake, teams(id, name, mission, charter, organizations(id, name)), jd_versions(id, version_no, version_major, version_minor, revision_kind, design_snapshot, status, source, organization_profile_id, created_at, jd_sections(id, kind, position, content, metadata, jd_evidence(id, source, snippet, confidence, ncs_competency_units(ncs_code, name, level))))")
    .eq("id", id)
    .order("version_no", { referencedTable: "jd_versions", ascending: false })
    .maybeSingle();
  if (!role || !role.jd_versions[0]) notFound();
  const version = role.jd_versions[0];
  const sections = [...version.jd_sections].sort((a, b) => a.position - b.position);
  const grouped = Object.groupBy(sections, (section) => section.kind);
  const designSnapshot = record(version.design_snapshot);
  const teamCharter = Object.keys(designSnapshot).length > 0 ? designSnapshot : record(role.teams?.charter ?? {});
  const roleIntake = record(role.intake);

  const [{ data: mappingRows }, { data: validationRows }, { data: profile }] = await Promise.all([
    supabase
      .from("role_ncs_mappings")
      .select("id, status, match_strength, rationale, matched_inputs, ncs_competency_units(ncs_code, name, level, definition, lclas_name, mclas_name, sclas_name, subd_name)")
      .eq("jd_version_id", version.id)
      .eq("status", "accepted")
      .order("match_strength"),
    supabase
      .from("jd_validation_runs")
      .select("status, coverage_score, summary, findings, model, created_at")
      .eq("jd_version_id", version.id)
      .order("created_at", { ascending: false })
      .limit(1),
    version.organization_profile_id
      ? supabase.from("organization_profiles").select("version_no, summary, structured_context").eq("id", version.organization_profile_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const validation = validationRows?.[0] ?? null;
  const isGroundedVersion = Boolean(profile && validation);
  const canCreateV11 = isGroundedVersion && version.version_major === 1 && version.version_minor === 0;
  const findings = validation ? objectList(validation.findings) : [];
  const companyContext = profile ? record(profile.structured_context) : {};
  const primaryRoleSnapshot = record(designSnapshot.primaryRole ?? {});
  const outputs = strings(primaryRoleSnapshot.outputs ?? roleIntake.outputs);
  const tools = strings(primaryRoleSnapshot.tools ?? roleIntake.tools);
  const stakeholders = strings(primaryRoleSnapshot.stakeholders ?? roleIntake.stakeholders);
  const teamOutputs = strings(teamCharter.teamOutputs ?? teamCharter.outputs);
  const teamResponsibilities = strings(teamCharter.teamResponsibilities ?? teamCharter.responsibilities);
  const suggestedRoles = objectList(teamCharter.suggestedRoles);
  const semanticVersion = `${version.version_major}.${version.version_minor}`;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />대시보드</Link>
          <div className="flex gap-2">{canCreateV11 && <Link href={`/jobs/${id}/edit`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-blue-200 hover:text-blue-700"><Pencil className="h-4 w-4" />v1.1 보완하기</Link>}<Link href="/jobs/new" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" />{isGroundedVersion ? "새 직무설계" : "새 방식으로 재설계"}</Link></div>
        </div>

        <header className="mt-7 overflow-hidden rounded-3xl bg-slate-950 text-white">
          <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div><p className="text-sm font-bold text-blue-300">{role.teams?.organizations?.name} · {role.teams?.name}</p><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{role.title}</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{grouped.mission?.[0]?.content}</p><div className="mt-6 flex flex-wrap gap-2"><Badge icon={<Sparkles className="h-3.5 w-3.5" />} text={`직무기술서 v${semanticVersion}`} />{isGroundedVersion ? <><Badge icon={<ShieldCheck className="h-3.5 w-3.5" />} text="Gemini + NCS 검토" /><Badge icon={<FileCheck2 className="h-3.5 w-3.5" />} text={version.revision_kind === "system_baseline" ? "시스템 기준본" : "사용자 보완본"} /></> : <Badge icon={<FileText className="h-3.5 w-3.5" />} text="이전 생성 방식" />}</div></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Evidence coverage</p><div className="mt-3 flex items-end gap-2"><span className="text-5xl font-black">{validation?.coverage_score ?? "—"}</span>{validation && <span className="pb-1 text-sm text-slate-400">/ 100</span>}</div><p className="mt-4 text-xs leading-5 text-slate-400">NCS 비율이 아니라 회사·팀·NCS 중 적절한 출처로 핵심 문장을 설명할 수 있는 정도입니다.</p></div>
          </div>
        </header>

        {!isGroundedVersion && <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><p className="text-sm font-black text-slate-900">새 근거 루프 적용 전 문서입니다</p><p className="mt-1 text-sm leading-6 text-slate-600">이 문서는 회사 프로필과 독립 검증 기록이 생기기 전에 작성되어, 과거 NCS 연결값을 검증된 근거로 표시하지 않습니다. 회사 소개와 팀 역할로 v1.0을 다시 만들면 문장별 근거와 검토 결과가 함께 저장됩니다.</p></div></div></section>}

        {validation && <section className={`mt-5 rounded-2xl border p-5 ${validation.status === "needs_review" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}><div className="flex gap-3"><CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${validation.status === "needs_review" ? "text-amber-600" : "text-emerald-600"}`} /><div><p className="text-sm font-black text-slate-900">NCS 근거 루프 검토 완료</p><p className="mt-1 text-sm leading-6 text-slate-600">{validation.summary}</p>{findings.length > 0 && <ul className="mt-3 space-y-1.5">{findings.slice(0, 4).map((finding, index) => <li key={index} className="text-xs leading-5 text-slate-500">• {textField(finding.message)}</li>)}</ul>}</div></div></section>}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <article className="space-y-5">
            {outputs.length > 0 && <ReportSection icon={<Target className="h-5 w-5" />} title="핵심 산출물"><BulletList items={outputs} /></ReportSection>}
            {(grouped.responsibility ?? []).length > 0 && <ReportSection icon={<BriefcaseBusiness className="h-5 w-5" />} title={labels.responsibility}><div className="mt-5 space-y-4">{(grouped.responsibility ?? []).map((section, index) => <div key={section.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-900 text-xs font-black text-white">{index + 1}</span><p className="text-sm font-semibold leading-6 text-slate-800">{section.content}</p></div>{isGroundedVersion && section.jd_evidence.length > 0 && <div className="mt-3 flex flex-wrap gap-2 pl-10">{section.jd_evidence.map((evidence) => evidence.ncs_competency_units ? <span key={evidence.id} className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-700">NCS · {evidence.ncs_competency_units.name}</span> : <span key={evidence.id} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500">{evidence.snippet}</span>)}</div>}</div>)}</div></ReportSection>}
            <div className="grid gap-5 lg:grid-cols-2">
              <ReportSection icon={<CheckCircle2 className="h-5 w-5" />} title={labels.qualification_required}><BulletList items={(grouped.qualification_required ?? []).map((item) => item.content)} /></ReportSection>
              <ReportSection icon={<Sparkles className="h-5 w-5" />} title={labels.qualification_preferred}><BulletList items={(grouped.qualification_preferred ?? []).map((item) => item.content)} /></ReportSection>
            </div>
            {(grouped.kpi ?? []).length > 0 && <ReportSection icon={<Gauge className="h-5 w-5" />} title={labels.kpi}><div className="mt-5 grid gap-4 md:grid-cols-2">{(grouped.kpi ?? []).map((section) => { const metadata = record(section.metadata); return <div key={section.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="font-bold text-slate-900">{section.content}</p><dl className="mt-3 space-y-2 text-xs leading-5"><KpiRow label="측정" value={textField(metadata.measure)} /><KpiRow label="주기" value={textField(metadata.cadence)} /><KpiRow label="목표" value={textField(metadata.targetGuide)} /><KpiRow label="근거" value={textField(metadata.rationale)} /></dl></div>; })}</div></ReportSection>}
            {(tools.length > 0 || stakeholders.length > 0) && <div className="grid gap-5 lg:grid-cols-2"><ReportSection icon={<FileText className="h-5 w-5" />} title="업무 도구·지식"><BulletList items={tools} /></ReportSection><ReportSection icon={<Users className="h-5 w-5" />} title="주요 이해관계자"><BulletList items={stakeholders} /></ReportSection></div>}
          </article>

          <aside className="space-y-5 xl:self-start">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2 text-blue-600"><Building2 className="h-4 w-4" /><p className="text-xs font-black uppercase tracking-[0.18em]">Company grounding</p></div><h2 className="mt-3 font-black text-slate-900">회사 프로필 v{profile?.version_no ?? "—"}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{profile?.summary ?? "이전 방식으로 생성된 JD라 연결된 회사 프로필이 없습니다."}</p>{strings(companyContext.strategicPriorities).length > 0 && <div className="mt-4 border-t border-slate-100 pt-4"><p className="text-xs font-bold text-slate-400">핵심 전략</p><BulletList items={strings(companyContext.strategicPriorities).slice(0, 4)} compact /></div>}</section>
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2 text-blue-600"><Network className="h-4 w-4" /><p className="text-xs font-black uppercase tracking-[0.18em]">Team design</p></div><h2 className="mt-3 font-black text-slate-900">{role.teams?.name} 설계</h2><p className="mt-3 text-sm leading-6 text-slate-600">{role.teams?.mission}</p>{teamOutputs.length > 0 && <div className="mt-4"><p className="text-xs font-bold text-slate-400">팀 산출물</p><BulletList items={teamOutputs.slice(0, 4)} compact /></div>}{teamResponsibilities.length > 0 && <div className="mt-4"><p className="text-xs font-bold text-slate-400">팀 책임</p><BulletList items={teamResponsibilities.slice(0, 4)} compact /></div>}{suggestedRoles.length > 0 && <div className="mt-4 border-t border-slate-100 pt-4"><p className="text-xs font-bold text-slate-400">권장 역할 포트폴리오</p><div className="mt-3 space-y-2">{suggestedRoles.map((item, index) => <div key={index} className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-bold text-slate-800">{textField(item.title)}</p><p className="mt-1 text-xs leading-5 text-slate-500">{textField(item.purpose)}</p></div>)}</div></div>}</section>
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2 text-blue-600"><ShieldCheck className="h-4 w-4" /><p className="text-xs font-black uppercase tracking-[0.18em]">NCS grounding</p></div><h2 className="mt-3 font-black text-slate-900">직무설계에 사용한 근거</h2><p className="mt-2 text-xs leading-5 text-slate-400">검색 결과가 아니라 Gemini가 회사·팀 맥락과 연결성을 재검토해 채택한 능력단위입니다.</p><div className="mt-4 space-y-3">{!isGroundedVersion ? <p className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">이전 연결값은 새 근거 루프의 검증을 거치지 않아 숨겼습니다. 새 방식으로 다시 설계해 주세요.</p> : (mappingRows ?? []).length === 0 ? <p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-500">직접 연결할 신뢰도 높은 NCS가 없어 회사·팀 입력을 중심 근거로 사용했습니다.</p> : (mappingRows ?? []).map((mapping) => { const unit = mapping.ncs_competency_units; return <div key={mapping.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-start justify-between gap-2"><p className="text-sm font-black leading-5 text-slate-800">{unit?.name}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${mapping.match_strength === "high" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{mapping.match_strength}</span></div><p className="mt-2 text-xs font-semibold text-slate-400">{unit?.ncs_code}{unit?.level ? ` · Level ${unit.level}` : ""}</p><p className="mt-3 text-xs leading-5 text-slate-600">{mapping.rationale}</p>{unit && [unit.lclas_name, unit.mclas_name, unit.sclas_name, unit.subd_name].some(Boolean) && <p className="mt-3 text-[11px] leading-5 text-slate-400">{[unit.lclas_name, unit.mclas_name, unit.sclas_name, unit.subd_name].filter(Boolean).join(" › ")}</p>}</div>; })}</div></section>
            {canCreateV11 ? <Link href={`/jobs/${id}/edit`} className="flex items-center justify-between rounded-2xl bg-blue-600 p-5 text-white shadow-lg shadow-blue-600/20"><div><p className="text-sm font-black">회사 고유 정보를 더 반영하시겠어요?</p><p className="mt-1 text-xs text-blue-100">선택 입력 후 NCS 재검토로 v1.1 생성</p></div><ArrowRight className="h-5 w-5" /></Link> : isGroundedVersion ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-sm font-black text-emerald-900">v1.1 검토 완료</p><p className="mt-1 text-xs leading-5 text-emerald-700">회사 고유 정보와 NCS 근거를 다시 검토한 현재 완성본입니다.</p></div> : <Link href="/jobs/new" className="flex items-center justify-between rounded-2xl bg-blue-600 p-5 text-white shadow-lg shadow-blue-600/20"><div><p className="text-sm font-black">회사 맥락부터 다시 설계하세요</p><p className="mt-1 text-xs text-blue-100">새 근거 루프로 검증된 v1.0 생성</p></div><ArrowRight className="h-5 w-5" /></Link>}
          </aside>
        </div>
      </div>
    </main>
  );
}

function Badge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200">{icon}{text}</span>;
}

function ReportSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><span className="text-blue-600">{icon}</span>{title}</h2>{children}</section>;
}

function BulletList({ items, compact = false }: { items: string[]; compact?: boolean }) {
  if (items.length === 0) return <p className="mt-4 text-sm text-slate-400">추가된 내용이 없습니다.</p>;
  return <ul className={`${compact ? "mt-2 space-y-1.5" : "mt-5 space-y-3"}`}>{items.map((item, index) => <li key={`${item}-${index}`} className={`flex gap-2.5 text-slate-600 ${compact ? "text-xs leading-5" : "text-sm leading-6"}`}><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />{item}</li>)}</ul>;
}

function KpiRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return <div className="grid grid-cols-[38px_1fr] gap-2"><dt className="font-bold text-slate-400">{label}</dt><dd className="text-slate-600">{value}</dd></div>;
}
