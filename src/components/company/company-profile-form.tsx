"use client";

import { useActionState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { updateCompanyProfile, type UpdateCompanyProfileState } from "@/app/(app)/company/actions";
import type { CompanyContext } from "@/lib/jd/company-designer";

const initialState: UpdateCompanyProfileState = { error: null };
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {hint && <span className="ml-2 text-xs text-slate-400">{hint}</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

export function CompanyProfileForm({ organizationId, profile }: { organizationId: string; profile: CompanyContext }) {
  const action = updateCompanyProfile.bind(null, organizationId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-black text-slate-900">회사 개요</h2>
        <div className="mt-5 space-y-5">
          <Field label="요약"><textarea name="summary" rows={4} className={inputClass} defaultValue={profile.summary} required /></Field>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="사업 영역" hint="한 줄에 하나씩"><textarea name="businessAreas" rows={4} className={inputClass} defaultValue={profile.businessAreas.join("\n")} /></Field>
            <Field label="제품·서비스" hint="한 줄에 하나씩"><textarea name="productsServices" rows={4} className={inputClass} defaultValue={profile.productsServices.join("\n")} /></Field>
            <Field label="주요 고객" hint="한 줄에 하나씩"><textarea name="customers" rows={4} className={inputClass} defaultValue={profile.customers.join("\n")} /></Field>
            <Field label="성장 단계"><input name="growthStage" className={inputClass} defaultValue={profile.growthStage} /></Field>
          </div>
          <Field label="비즈니스 모델·수익구조"><textarea name="businessModel" rows={3} className={inputClass} defaultValue={profile.businessModel} /></Field>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-black text-slate-900">미션·비전·핵심가치</h2>
        <p className="mt-1 text-sm text-slate-500">회사가 명시적으로 밝힌 내용이 있으면 그대로, 없으면 사업 내용을 바탕으로 정리해 주세요. 저장하면 사람이 확인한 내용으로 표시됩니다.</p>
        <div className="mt-5 space-y-5">
          <Field label="미션" hint="이 회사가 존재하는 이유"><textarea name="mission" rows={3} className={inputClass} defaultValue={profile.mission} required /></Field>
          <Field label="비전" hint="이 회사가 지향하는 미래"><textarea name="vision" rows={3} className={inputClass} defaultValue={profile.vision} /></Field>
          <Field label="핵심가치" hint="한 줄에 하나씩"><textarea name="coreValues" rows={3} className={inputClass} defaultValue={profile.coreValues.join("\n")} /></Field>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-black text-slate-900">전략·조직</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="전략 우선순위" hint="한 줄에 하나씩"><textarea name="strategicPriorities" rows={4} className={inputClass} defaultValue={profile.strategicPriorities.join("\n")} /></Field>
          <Field label="조직 문화" hint="한 줄에 하나씩"><textarea name="culture" rows={4} className={inputClass} defaultValue={profile.culture.join("\n")} /></Field>
          <Field label="핵심 용어" hint="한 줄에 하나씩 · 고유명사·제품명 등"><textarea name="keyTerms" rows={4} className={inputClass} defaultValue={profile.keyTerms.join("\n")} /></Field>
          <Field label="확인되지 않은 사항" hint="한 줄에 하나씩"><textarea name="uncertainties" rows={4} className={inputClass} defaultValue={profile.uncertainties.join("\n")} /></Field>
        </div>
      </section>

      {state.error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700">{state.error}</div>}
      <div className="flex flex-col gap-4 rounded-3xl bg-slate-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black">저장하면 새 버전이 만들어집니다</p>
          <p className="mt-2 max-w-xl text-xs leading-5 text-slate-400">기존 버전은 그대로 보존되고, 이후 새로 만드는 직무설계와 v1.1 보완부터 이 내용이 반영됩니다.</p>
        </div>
        <button type="submit" disabled={pending} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold hover:bg-blue-500 disabled:opacity-60">
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {pending ? "저장 중…" : "새 버전으로 저장"}
        </button>
      </div>
    </form>
  );
}
