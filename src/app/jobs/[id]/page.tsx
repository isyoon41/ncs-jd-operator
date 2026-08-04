import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const labels = { mission: "직무 미션", responsibility: "주요 책임", qualification_required: "필수 자격", qualification_preferred: "우대 자격", kpi: "핵심 성과지표" } as const;

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/jobs/${id}`);

  const { data: role } = await supabase.from("team_roles").select("id, title, seniority_hint, status, teams(name, organizations(name)), jd_versions(id, version_no, status, created_at, jd_sections(id, kind, position, content, jd_evidence(id, ncs_competency_units(ncs_code, name, level))))").eq("id", id).order("version_no", { referencedTable: "jd_versions", ascending: false }).limit(1, { referencedTable: "jd_versions" }).maybeSingle();
  if (!role) notFound();
  const version = role.jd_versions[0];
  const sections = [...(version?.jd_sections ?? [])].sort((a, b) => a.position - b.position);
  const grouped = Object.groupBy(sections, (section) => section.kind);
  const evidence = new Map<string, { ncs_code: string; name: string; level: string | null }>();
  sections.forEach((section) => section.jd_evidence.forEach((item) => { const unit = item.ncs_competency_units; if (unit) evidence.set(unit.ncs_code, unit); }));

  return <main className="min-h-screen bg-slate-50"><div className="mx-auto max-w-5xl px-5 py-8 sm:px-8"><div className="flex items-center justify-between"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />대시보드</Link><Link href="/jobs/new" className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />새 JD</Link></div><header className="mt-8 rounded-2xl bg-slate-950 p-7 text-white sm:p-9"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-blue-300">{role.teams?.organizations?.name} · {role.teams?.name}</p><h1 className="mt-3 text-3xl font-bold tracking-tight">{role.title}</h1>{role.seniority_hint && <p className="mt-2 text-sm text-slate-300">{role.seniority_hint}</p>}</div><span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300">초안 v{version?.version_no ?? 1}</span></div></header><div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]"><article className="space-y-5">{Object.entries(labels).map(([kind, label]) => { const items = grouped[kind as keyof typeof grouped] ?? []; if (items.length === 0) return null; return <section key={kind} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><FileText className="h-5 w-5 text-blue-600" />{label}</h2>{kind === "mission" ? <p className="mt-4 leading-7 text-slate-700">{items[0].content}</p> : <ul className="mt-4 space-y-3">{items.map((item) => <li key={item.id} className="flex gap-3 text-sm leading-6 text-slate-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />{item.content}</li>)}</ul>}</section>; })}</article><aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:self-start"><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Evidence</p><h2 className="mt-1 font-bold text-slate-900">연결된 NCS 능력단위</h2><div className="mt-4 space-y-3">{evidence.size === 0 ? <p className="text-sm leading-6 text-slate-400">연결된 능력단위가 없습니다.</p> : [...evidence.values()].map((unit) => <div key={unit.ncs_code} className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-800">{unit.name}</p><p className="mt-1 text-xs text-slate-400">{unit.ncs_code}{unit.level ? ` · Level ${unit.level}` : ""}</p></div>)}</div></aside></div></div></main>;
}
