import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  ArrowRight,
  Building2,
  Database,
  FileCheck2,
  FileText,
  Network,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAccessibleOrganizations, resolveActiveOrgId } from "@/lib/org/active-organization";
import { AccessRequestForm } from "@/components/onboarding/access-request-form";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { organizations: allOrganizations } = await getAccessibleOrganizations(supabase, user.id);
  const organizations = allOrganizations.filter((organization) => organization.status === "active");
  const heldOrganizations = allOrganizations.filter((organization) => organization.status === "held");
  const cookieStore = await cookies();
  const activeOrgId = resolveActiveOrgId(cookieStore.get("active_org_id")?.value, organizations);
  const organizationIds = activeOrgId ? [activeOrgId] : organizations.map((organization) => organization.id);

  const { data: teams } = organizationIds.length
    ? await supabase
        .from("teams")
        .select("id, name, organization_id, team_roles(id, title, seniority_hint, status, updated_at)")
        .in("organization_id", organizationIds)
        .order("name")
    : { data: [] };
  const roles = (teams ?? [])
    .flatMap((team) =>
      team.team_roles.map((role) => ({
        ...role,
        teamName: team.name,
        organization: organizations.find((item) => item.id === team.organization_id),
      })),
    )
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const { data: profileRows } = organizationIds.length
    ? await supabase
        .from("organization_profiles")
        .select("organization_id, version_no, summary")
        .in("organization_id", organizationIds)
        .order("version_no", { ascending: false })
    : { data: [] };
  const latestProfiles = [...new Map((profileRows ?? []).map((profile) => [profile.organization_id, profile])).values()];
  const approvedCount = roles.filter((role) => role.status === "approved").length;
  const hasOrganization = organizations.length > 0;

  const { data: pendingRequests } = hasOrganization
    ? { data: [] }
    : await supabase
        .from("organization_access_requests")
        .select("id, requested_organization_name")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);
  const pendingRequest = pendingRequests?.[0] ?? null;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        {!hasOrganization ? (
          <>
            <section className="rounded-3xl bg-slate-950 p-8 text-white sm:p-10">
              {heldOrganizations.length > 0 ? (
                <>
                  <p className="text-sm font-semibold text-amber-300">Access held</p>
                  <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">접근이 일시 정지되었습니다.</h1>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">{heldOrganizations.map((organization) => organization.name).join(", ")}에 대한 접근이 관리자에 의해 보류되었습니다. 재개가 필요하면 관리자에게 문의해 주세요.</p>
                </>
              ) : pendingRequest ? (
                <>
                  <p className="text-sm font-semibold text-blue-300">Access request pending</p>
                  <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">가입 신청이 접수되어 검토 중입니다.</h1>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">신청하신 회사({pendingRequest.requested_organization_name})의 관리자가 승인하면 자동으로 작업 공간이 열립니다. 승인 전까지는 별도로 하실 일이 없습니다.</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-blue-300">Workspace connection required</p>
                  <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">소속 회사를 신청하고 관리자 승인을 받으세요.</h1>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">회사명을 입력해 신청하면, 관리자가 확인 후 승인합니다. 승인되면 아래 기능이 자동으로 활성화됩니다.</p>
                  <div className="mt-7 max-w-sm"><AccessRequestForm /></div>
                </>
              )}
            </section>
            <WorkflowOverview disabled />
          </>
        ) : (
          <>
            <section className="flex flex-col justify-between gap-6 rounded-3xl bg-slate-950 p-8 text-white sm:flex-row sm:items-end sm:p-10">
              <div>
                <p className="text-sm font-semibold text-blue-300">{activeOrgId ? organizations.find((organization) => organization.id === activeOrgId)?.name : organizations.length > 1 ? `${organizations.length}개 회사 통합 보기` : organizations[0]?.name} Workspace</p>
                <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">회사를 이해한 AI가 NCS 근거로 직무를 설계합니다.</h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">회사 소개자료와 간단한 팀 역할만 입력하면 Gemini가 팀 구조와 직무기술서 v1.0을 만들고 NCS 근거 루프로 다시 검토합니다.</p>
              </div>
              <Link href="/jobs/new" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500"><Plus className="h-4 w-4" />v1.0 직무설계 시작</Link>
            </section>

            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric icon={<Building2 className="h-5 w-5" />} label="연결된 기업" value={String(organizations.length)} detail={organizations[0]?.name} />
              <Metric icon={<ShieldCheck className="h-5 w-5" />} label="회사 프로필 준비" value={String(latestProfiles.length)} detail="Gemini 분석 완료" />
              <Metric icon={<Users className="h-5 w-5" />} label="등록 팀" value={String(teams?.length ?? 0)} detail="조직 구조" />
              <Metric icon={<FileText className="h-5 w-5" />} label="직무기술서" value={String(roles.length)} detail={`${approvedCount}개 승인`} />
            </section>

            <WorkflowOverview />

            <section className="mt-10">
              <div className="flex items-end justify-between">
                <div><p className="text-sm font-semibold text-blue-600">Recent drafts</p><h2 className="mt-1 text-2xl font-bold text-slate-950">최근 직무기술서</h2></div>
              </div>
              {roles.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                  <FileText className="mx-auto h-8 w-8 text-slate-300" />
                  <h3 className="mt-4 font-bold text-slate-800">회사 이해에서 첫 직무설계를 시작하세요</h3>
                  <p className="mt-2 text-sm text-slate-400">회사 자료와 팀 역할을 바탕으로 NCS 검토가 완료된 v1.0을 만듭니다.</p>
                  <Link href="/jobs/new" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-600">v1.0 만들기<ArrowRight className="h-4 w-4" /></Link>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {roles.slice(0, 12).map((role) => (
                    <Link key={role.id} href={`/jobs/${role.id}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                      <div className="flex items-center justify-between"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{role.status === "draft" ? "초안" : role.status}</span><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500" /></div>
                      <h3 className="mt-4 text-lg font-bold text-slate-900">{role.title}</h3>
                      <p className="mt-1 text-sm text-slate-400">{role.organization?.name} · {role.teamName}</p>
                      {role.seniority_hint && <p className="mt-4 text-xs font-medium text-slate-500">{role.seniority_hint}</p>}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail?: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between text-blue-600"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50">{icon}</span><span className="text-xs font-medium text-slate-400">{detail}</span></div><p className="mt-5 text-3xl font-black tracking-tight text-slate-950">{value}</p><p className="mt-1 text-sm font-medium text-slate-500">{label}</p></div>;
}

function WorkflowOverview({ disabled = false }: { disabled?: boolean }) {
  const steps = [
    { icon: <Building2 className="h-5 w-5" />, title: "회사 이해", text: "소개·IR 자료에서 사업과 전략 맥락을 구조화합니다." },
    { icon: <Network className="h-5 w-5" />, title: "팀 최소 입력", text: "팀명과 팀 역할만 입력해 설계를 시작합니다." },
    { icon: <Database className="h-5 w-5" />, title: "Gemini + NCS", text: "산업 충돌과 문장별 근거를 내부에서 재검토합니다." },
    { icon: <FileCheck2 className="h-5 w-5" />, title: "v1.0 → v1.1", text: "기준본을 그대로 쓰거나 선택 입력으로 보완합니다." },
  ];
  return <section className={`mt-10 ${disabled ? "opacity-55" : ""}`}><div><p className="text-sm font-semibold text-blue-600">Current workflow</p><h2 className="mt-1 text-2xl font-bold text-slate-950">현재 구현된 업무 흐름</h2></div><div className="mt-5 grid gap-4 md:grid-cols-4">{steps.map((step, index) => <div key={step.title} className="relative rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white">{step.icon}</span><span className="text-xs font-black text-slate-300">0{index + 1}</span></div><h3 className="mt-5 font-bold text-slate-900">{step.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{step.text}</p></div>)}</div></section>;
}
