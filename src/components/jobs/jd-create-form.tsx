"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  Building2,
  Check,
  Database,
  FileText,
  FileUp,
  LoaderCircle,
  Network,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { createJdDraft, type CreateJdState } from "@/app/(app)/jobs/new/actions";

type Organization = { id: string; name: string };
type CompanyProfile = {
  organization_id: string;
  version_no: number;
  summary: string;
  hasDesignBasis: boolean;
  basisStatus: "ready" | "needs_review";
};

const initialState: CreateJdState = { error: null };
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-semibold text-slate-800">{label}</span>{hint && <span className="ml-2 text-xs text-slate-400">{hint}</span>}<div className="mt-2">{children}</div></label>;
}

function StepTitle({ number, icon, eyebrow, title, text }: { number: string; icon: React.ReactNode; eyebrow: string; title: string; text: string }) {
  return <div className="mb-7 flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">{icon}</span><div><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">{number} · {eyebrow}</p><h2 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{text}</p></div></div>;
}

export function JdCreateForm({
  organizations,
  profiles,
  defaultOrganizationId,
}: {
  organizations: Organization[];
  profiles: CompanyProfile[];
  defaultOrganizationId?: string | null;
}) {
  const [state, formAction, pending] = useActionState(createJdDraft, initialState);
  const [organizationId, setOrganizationId] = useState(defaultOrganizationId ?? organizations[0]?.id ?? "");
  const currentProfile = useMemo(() => profiles.find((profile) => profile.organization_id === organizationId), [profiles, organizationId]);
  const [showNewSource, setShowNewSource] = useState(false);

  return (
    <form action={formAction} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <StepTitle number="01" eyebrow="Company context" icon={<Building2 className="h-5 w-5" />} title="Gemini가 회사를 먼저 이해합니다" text="회사 소개를 직접 입력하거나 IR·회사소개 자료를 올려 주세요. 확인 가능한 사실만 회사 프로필로 구조화해 이후 모든 팀과 직무설계에 재사용합니다." />
          <div className="space-y-5">
            <Field label="회사"><select name="organizationId" value={organizationId} onChange={(event) => { setOrganizationId(event.target.value); setShowNewSource(false); }} className={inputClass} required>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></Field>
            {currentProfile && <div className={`flex gap-3 rounded-2xl border p-4 ${currentProfile.hasDesignBasis && currentProfile.basisStatus === "ready" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><Check className={`mt-0.5 h-5 w-5 shrink-0 ${currentProfile.hasDesignBasis && currentProfile.basisStatus === "ready" ? "text-emerald-600" : "text-amber-600"}`} /><div><p className={`text-sm font-bold ${currentProfile.hasDesignBasis && currentProfile.basisStatus === "ready" ? "text-emerald-950" : "text-amber-950"}`}>회사 프로필 v{currentProfile.version_no}이 준비되어 있습니다</p><p className={`mt-1 text-xs leading-5 ${currentProfile.hasDesignBasis && currentProfile.basisStatus === "ready" ? "text-emerald-700" : "text-amber-800"}`}>{currentProfile.summary}</p><p className={`mt-2 text-xs font-semibold ${currentProfile.hasDesignBasis && currentProfile.basisStatus === "ready" ? "text-emerald-700" : "text-amber-800"}`}>{currentProfile.hasDesignBasis ? (currentProfile.basisStatus === "ready" ? "회사 직무설계 기준점까지 AI 검토가 완료되었습니다." : "회사 기준점에 사람 확인이 필요한 항목이 있습니다.") : "이전 형식의 프로필입니다. 생성 시 회사 기준점을 자동으로 보강합니다."}</p><Link href="/company" className={`mt-2 inline-block text-xs font-bold underline ${currentProfile.hasDesignBasis && currentProfile.basisStatus === "ready" ? "text-emerald-700" : "text-amber-800"}`}>프로필과 기준점 확인하기</Link></div></div>}
            {currentProfile && !showNewSource ? (
              <button type="button" onClick={() => setShowNewSource(true)} className="text-sm font-bold text-blue-600 hover:text-blue-700">다른 자료로 새 프로필 만들기</button>
            ) : (
              <div className="space-y-3">
                {currentProfile && <button type="button" onClick={() => setShowNewSource(false)} className="text-sm font-bold text-slate-400 hover:text-slate-600">취소하고 기존 프로필 사용하기</button>}
                <div className="grid gap-5 lg:grid-cols-2">
                  <Field label="회사 소개 직접 입력" hint={currentProfile ? "선택 · 새 프로필 생성" : "자료가 없으면 필수"}><textarea name="companyIntroduction" rows={9} className={inputClass} placeholder="예: OO기업은 제조 설비를 대상으로 예지보전 솔루션을 제공하고 있습니다. 주요 고객은 국내 중견 제조사이며…" maxLength={30000} /></Field>
                  <Field label="회사 소개·IR 자료" hint="선택 · PDF/TXT/MD, 최대 8MB"><label className="flex min-h-[244px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center transition hover:border-blue-400 hover:bg-blue-50/40"><FileUp className="h-9 w-9 text-slate-300" /><span className="mt-4 text-sm font-bold text-slate-700">파일을 선택해 주세요</span><span className="mt-2 text-xs leading-5 text-slate-400">PDF는 표와 문서 구조까지 Gemini가 직접 읽습니다.<br />자료는 회사 전용 비공개 저장소에 보관됩니다.</span><input type="file" name="companyFile" accept="application/pdf,text/plain,text/markdown,.md,.txt,.pdf" className="mt-5 block w-full max-w-xs text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:font-bold file:text-white" /></label></Field>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <StepTitle number="02" eyebrow="Team seed" icon={<Network className="h-5 w-5" />} title="팀 정보는 두 가지만 알려주세요" text="팀명과 회사에서 담당하는 역할을 편하게 적으면 됩니다. 팀 미션·산출물·책임·필요 직무는 Gemini가 회사 맥락과 NCS를 이용해 설계합니다." />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="팀명"><input name="teamName" className={inputClass} placeholder="예: 사업개발팀" maxLength={100} required /></Field>
            <Field label="대표 직무명" hint="선택 · 없으면 AI가 제안"><input name="roleTitleHint" className={inputClass} placeholder="예: Technical Business Developer" maxLength={100} /></Field>
            <div className="sm:col-span-2"><Field label="이 팀이 회사에서 담당하는 역할"><textarea name="teamRole" rows={7} className={inputClass} placeholder="예: 바이오 원료와 기술 솔루션을 국내외 고객에게 제안하고, 고객 요구를 연구개발팀과 연결해 파트너십과 매출 기회를 만든다." maxLength={3000} required /></Field></div>
          </div>
        </section>
      </div>

      <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
        <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-900/10">
          <div className="flex items-center gap-2 text-blue-300"><BrainCircuit className="h-5 w-5" /><p className="text-xs font-bold uppercase tracking-[0.18em]">Gemini + NCS design loop</p></div>
          <h2 className="mt-4 text-xl font-bold">직무기술서 v1.0 자동 설계</h2>
          <div className="mt-5 space-y-4">
            {[{ icon: <FileText className="h-4 w-4" />, title: "회사 사실 추출", text: "사업·고객·가치사슬·기술·제약을 구분" }, { icon: <BrainCircuit className="h-4 w-4" />, title: "회사 기준점 설계", text: "가치 창출 논리·핵심 역량·가드레일 확정" }, { icon: <Network className="h-4 w-4" />, title: "팀 맥락 연결", text: "회사의 기준점 중 이번 팀에 필요한 부분만 선별" }, { icon: <Database className="h-4 w-4" />, title: "NCS 근거 탐색", text: "표준 과업을 찾되 회사 고유 책임은 억지 매핑하지 않음" }, { icon: <ShieldCheck className="h-4 w-4" />, title: "독립 검토", text: "회사 적합성·NCS 근거·환각을 재검사" }].map((item) => <div key={item.title} className="flex gap-3"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-blue-300">{item.icon}</span><div><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-400">{item.text}</p></div></div>)}
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-bold text-emerald-300">사용자가 NCS를 고르지 않습니다</p><p className="mt-2 text-xs leading-5 text-slate-400">시스템이 내부에서 적합성을 판단하고 최종 보고서에서 각 문장이 왜 생성됐는지 설명합니다.</p></div>
        </section>
        {state.error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700">{state.error}</div>}
        <button type="submit" disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{pending ? "회사·NCS를 분석하는 중…" : "직무기술서 v1.0 만들기"}{!pending && <ArrowRight className="h-4 w-4" />}</button>
        <p className="text-center text-xs leading-5 text-slate-400">새 회사 자료를 분석할 때는 약 60~180초가 걸릴 수 있습니다.<br />완성 후 선택 정보를 보완해 v1.1, v1.2처럼 계속 업데이트할 수 있습니다.</p>
      </aside>
    </form>
  );
}
