"use client";

import { useActionState } from "react";
import { AlertTriangle, Building2, Check, LoaderCircle, RefreshCw, Save, Sparkles, Target, Users } from "lucide-react";
import { refineJdDraft, type RefineJdState } from "@/app/(app)/jobs/[id]/edit/actions";

type DraftContent = {
  teamMission: string;
  teamOutputs: string[];
  teamResponsibilities: string[];
  suggestedRoles: string[];
  roleTitle: string;
  mission: string;
  outputs: string[];
  responsibilities: string[];
  inferredResponsibilities: string[];
  requiredQualifications: string[];
  inferredRequiredQualifications: string[];
  preferredQualifications: string[];
  inferredPreferredQualifications: string[];
  tools: string[];
  stakeholders: string[];
  kpis: string[];
};

const initialState: RefineJdState = { error: null };
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-bold text-slate-800">{label}</span>{hint && <span className="ml-2 text-xs text-slate-400">{hint}</span>}<div className="mt-2">{children}</div></label>;
}

function SectionTitle({ icon, eyebrow, title, text }: { icon: React.ReactNode; eyebrow: string; title: string; text: string }) {
  return <div className="mb-6 flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">{icon}</span><div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p><h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{text}</p></div></div>;
}

function InferenceReviewNotice({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-800">확인 필요</span>
            <p className="text-xs font-bold">아래 문장은 회사·팀·NCS에 직접 근거가 없어 AI가 추론했습니다.</p>
          </div>
          <ul className="mt-2 space-y-1.5 text-xs leading-5 text-amber-800">
            {items.map((item, index) => <li key={`${index}-${item}`}>• {item}</li>)}
          </ul>
          <p className="mt-2 text-[11px] leading-5 text-amber-700">실제 업무와 맞으면 유지하고, 다르면 위 입력란에서 수정하거나 삭제해 주세요.</p>
        </div>
      </div>
    </div>
  );
}

export function JdRefineForm({ roleId, content }: { roleId: string; content: DraftContent }) {
  const action = refineJdDraft.bind(null, roleId);
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <SectionTitle icon={<Building2 className="h-5 w-5" />} eyebrow="Team context" title="팀 설계 보완" text="팀의 존재 이유나 책임 경계를 더 정확하게 알고 있다면 수정하세요. 입력한 내용은 모든 직무의 상위 맥락으로 사용됩니다." />
        <div className="space-y-5"><Field label="팀 미션"><textarea name="teamMission" rows={4} className={inputClass} defaultValue={content.teamMission} required /></Field><div className="grid gap-5 md:grid-cols-2"><Field label="팀의 핵심 산출물" hint="한 줄에 하나씩"><textarea name="teamOutputs" rows={7} className={inputClass} defaultValue={content.teamOutputs.join("\n")} /></Field><Field label="팀의 책임 범위" hint="한 줄에 하나씩"><textarea name="teamResponsibilities" rows={7} className={inputClass} defaultValue={content.teamResponsibilities.join("\n")} /></Field></div><Field label="팀에 필요한 역할 구성" hint="선택 · 역할명만 한 줄에 하나씩"><textarea name="suggestedRoles" rows={4} className={inputClass} defaultValue={content.suggestedRoles.join("\n")} /></Field></div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <SectionTitle icon={<Users className="h-5 w-5" />} eyebrow="Role design" title="대표 직무 보완" text="실제 조직에서 사용하는 표현으로 필요한 부분만 수정하세요. Gemini가 회사 프로필과 NCS를 대조해 문장과 근거를 다시 구성합니다." />
        <div className="space-y-5"><div className="grid gap-5 md:grid-cols-2"><Field label="직무명"><input name="roleTitle" className={inputClass} defaultValue={content.roleTitle} required /></Field><Field label="핵심 산출물" hint="한 줄에 하나씩"><textarea name="outputs" rows={4} className={inputClass} defaultValue={content.outputs.join("\n")} /></Field></div><Field label="직무 미션"><textarea name="mission" rows={4} className={inputClass} defaultValue={content.mission} required /></Field><Field label="주요 책임" hint="한 줄에 하나씩"><textarea name="responsibilities" rows={9} className={inputClass} defaultValue={content.responsibilities.join("\n")} required /><InferenceReviewNotice items={content.inferredResponsibilities} /></Field></div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <SectionTitle icon={<Check className="h-5 w-5" />} eyebrow="Requirements" title="자격요건과 업무 환경" text="학력·연차·자격증은 실제로 필요한 경우에만 남겨 주세요. 자료에서 확인할 수 없는 요건은 Gemini 검토에서 경고하거나 완화합니다." />
        <div className="grid gap-5 md:grid-cols-2"><Field label="필수 자격요건" hint="한 줄에 하나씩"><textarea name="requiredQualifications" rows={8} className={inputClass} defaultValue={content.requiredQualifications.join("\n")} /><InferenceReviewNotice items={content.inferredRequiredQualifications} /></Field><Field label="우대 자격요건" hint="한 줄에 하나씩"><textarea name="preferredQualifications" rows={8} className={inputClass} defaultValue={content.preferredQualifications.join("\n")} /><InferenceReviewNotice items={content.inferredPreferredQualifications} /></Field><Field label="사용 도구·필요 지식" hint="선택"><textarea name="tools" rows={6} className={inputClass} defaultValue={content.tools.join("\n")} /></Field><Field label="주요 이해관계자" hint="선택"><textarea name="stakeholders" rows={6} className={inputClass} defaultValue={content.stakeholders.join("\n")} /></Field></div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <SectionTitle icon={<Target className="h-5 w-5" />} eyebrow="Performance" title="KPI 보완" text="회사에서 이미 관리하는 KPI가 있다면 한 줄에 하나씩 입력하세요. Gemini가 측정방법·주기·목표 설정 근거를 함께 검토합니다." />
        <Field label="핵심 성과지표(KPI)" hint="한 줄에 하나씩"><textarea name="kpis" rows={7} className={inputClass} defaultValue={content.kpis.join("\n")} /></Field>
      </section>

      {state.error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm leading-6 text-red-700">{state.error}</div>}
      <div className="flex flex-col gap-4 rounded-3xl bg-slate-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-blue-300" /><p className="text-sm font-black">NCS 근거 루프를 다시 실행합니다</p></div><p className="mt-2 max-w-xl text-xs leading-5 text-slate-400">회사·팀 맥락, 산업분류, 책임별 근거, 자격요건 환각, KPI 완성도를 재검토하고 기존 v1.0을 보존한 채 v1.1을 만듭니다.</p></div><button type="submit" disabled={pending} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold hover:bg-blue-500 disabled:opacity-60">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{pending ? "Gemini·NCS 재검토 중…" : "검토 후 v1.1 만들기"}</button></div>
      <p className="flex items-center justify-center gap-2 text-center text-xs leading-5 text-slate-400"><Sparkles className="h-3.5 w-3.5" />입력하지 않은 항목은 v1.0을 유지하거나 회사 맥락에 맞게 보완합니다.</p>
    </form>
  );
}
