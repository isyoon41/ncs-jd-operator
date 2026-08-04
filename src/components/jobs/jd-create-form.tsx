"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, Plus, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createJdDraft, type CreateJdState } from "@/app/jobs/new/actions";

type Organization = { id: string; name: string };
type Team = { id: string; name: string; organization_id: string };
type NcsUnit = { id: string; ncs_code: string; name: string; level: string | null };

const initialState: CreateJdState = { error: null };

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-semibold text-slate-800">{label}</span>{hint && <span className="ml-2 text-xs text-slate-400">{hint}</span>}<div className="mt-2">{children}</div></label>;
}

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

export function JdCreateForm({ organizations, teams }: { organizations: Organization[]; teams: Team[] }) {
  const [state, formAction, pending] = useActionState(createJdDraft, initialState);
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const [teamId, setTeamId] = useState("");
  const [createTeam, setCreateTeam] = useState(teams.filter((team) => team.organization_id === organizationId).length === 0);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<NcsUnit[]>([]);
  const [selected, setSelected] = useState<NcsUnit[]>([]);
  const availableTeams = useMemo(() => teams.filter((team) => team.organization_id === organizationId), [teams, organizationId]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const supabase = createClient();
      const term = query.trim().replace(/[%,]/g, "");
      const { data } = await supabase.from("ncs_competency_units").select("id, ncs_code, name, level").or(`name.ilike.%${term}%,ncs_code.ilike.%${term}%`).limit(8);
      setResults((data ?? []).filter((unit) => !selected.some((item) => item.id === unit.id)));
      setSearching(false);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, selected]);

  function changeOrganization(value: string) {
    setOrganizationId(value); setTeamId("");
    setCreateTeam(teams.filter((team) => team.organization_id === value).length === 0);
  }

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Step 1</p><h2 className="mt-1 text-xl font-bold text-slate-950">직무 기본 정보</h2></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="회사"><select name="organizationId" value={organizationId} onChange={(event) => changeOrganization(event.target.value)} className={inputClass} required>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></Field>
            <Field label="팀">
              {!createTeam && availableTeams.length > 0 ? <select name="teamId" value={teamId} onChange={(event) => setTeamId(event.target.value)} className={inputClass} required><option value="">팀을 선택하세요</option>{availableTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select> : <input name="newTeamName" className={inputClass} placeholder="예: 제품개발팀" required />}
              {availableTeams.length > 0 && <button type="button" onClick={() => { setCreateTeam((value) => !value); setTeamId(""); }} className="mt-2 flex items-center gap-1 text-xs font-semibold text-blue-600"><Plus className="h-3.5 w-3.5" />{createTeam ? "기존 팀 선택" : "새 팀 만들기"}</button>}
            </Field>
            <Field label="직무명"><input name="title" className={inputClass} placeholder="예: B2B SaaS 프로덕트 매니저" maxLength={100} required /></Field>
            <Field label="직급·숙련도" hint="선택"><input name="seniority" className={inputClass} placeholder="예: 5년 이상 / Senior" maxLength={80} /></Field>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Step 2</p><h2 className="mt-1 text-xl font-bold text-slate-950">미션과 역할</h2></div>
          <div className="space-y-5">
            <Field label="직무 미션" hint="이 직무가 존재하는 이유"><textarea name="mission" rows={3} className={inputClass} placeholder="고객 문제를 발견하고 제품 전략과 실행을 연결해 지속적인 사업 성장을 만든다." maxLength={2000} required /></Field>
            <Field label="주요 책임" hint="한 줄에 하나씩"><textarea name="responsibilities" rows={6} className={inputClass} placeholder={"고객 및 시장 데이터를 바탕으로 제품 기회를 정의한다.\n분기별 로드맵과 우선순위를 수립한다."} required /></Field>
            <Field label="업무 도구·환경" hint="선택, 한 줄에 하나씩"><textarea name="tools" rows={3} className={inputClass} placeholder={"Jira\nFigma\nSQL"} /></Field>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Step 3</p><h2 className="mt-1 text-xl font-bold text-slate-950">자격요건과 성과지표</h2></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="필수 자격" hint="한 줄에 하나씩"><textarea name="requiredQualifications" rows={5} className={inputClass} placeholder="제품 기획 또는 PM 경력 3년 이상" /></Field>
            <Field label="우대 자격" hint="한 줄에 하나씩"><textarea name="preferredQualifications" rows={5} className={inputClass} placeholder="B2B SaaS 제품 경험" /></Field>
            <div className="sm:col-span-2"><Field label="핵심 성과지표(KPI)" hint="한 줄에 하나씩"><textarea name="kpis" rows={4} className={inputClass} placeholder={"핵심 기능 활성 사용자 비율\n로드맵 분기 달성률"} /></Field></div>
          </div>
        </section>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">NCS Evidence</p><h2 className="mt-1 text-lg font-bold text-slate-950">능력단위 연결</h2><p className="mt-1 text-sm leading-6 text-slate-500">직무의 주요 책임을 뒷받침할 NCS 능력단위를 선택하세요.</p>
          <div className="relative mt-4"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => { const value = event.target.value; setQuery(value); if (value.trim().length < 2) setResults([]); }} className={`${inputClass} pl-9`} placeholder="능력단위명 또는 코드" />{searching && <LoaderCircle className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-blue-500" />}</div>
          {results.length > 0 && <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">{results.map((unit) => <button key={unit.id} type="button" onClick={() => { setSelected((items) => [...items, unit]); setQuery(""); setResults([]); }} className="block w-full border-b border-slate-100 px-3 py-3 text-left last:border-0 hover:bg-blue-50"><span className="block text-sm font-semibold text-slate-800">{unit.name}</span><span className="mt-0.5 block text-xs text-slate-400">{unit.ncs_code}{unit.level ? ` · Level ${unit.level}` : ""}</span></button>)}</div>}
          <div className="mt-4 space-y-2">{selected.length === 0 && <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">선택한 능력단위가 없습니다.</p>}{selected.map((unit) => <div key={unit.id} className="rounded-xl border border-blue-100 bg-blue-50 p-3"><input type="hidden" name="ncsIds" value={unit.id} /><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold text-slate-800">{unit.name}</p><p className="mt-0.5 text-xs text-slate-500">{unit.ncs_code}</p></div><button type="button" onClick={() => setSelected((items) => items.filter((item) => item.id !== unit.id))} aria-label="선택 해제"><X className="h-4 w-4 text-slate-400" /></button></div></div>)}</div>
        </section>
        {state.error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>}
        <button type="submit" disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{pending ? "초안 저장 중..." : "JD 초안 저장"}</button>
        <p className="text-center text-xs leading-5 text-slate-400">저장하면 직무, 버전, 섹션과 NCS 근거가 함께 생성됩니다.</p>
      </aside>
    </form>
  );
}
