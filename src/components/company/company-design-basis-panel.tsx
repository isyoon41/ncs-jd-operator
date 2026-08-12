import { AlertTriangle, CheckCircle2, Compass, Sparkles } from "lucide-react";
import type { CompanyBasisValidation, CompanyDesignBasis } from "@/lib/jd/company-designer";

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2 text-sm leading-6 text-slate-700">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CompanyDesignBasisPanel({
  basis,
  validation,
}: {
  basis: CompanyDesignBasis;
  validation: CompanyBasisValidation;
}) {
  const isReady = validation.status === "ready";
  const hasBasis = Boolean(basis.valueCreationLogic || basis.criticalCapabilities.length || basis.roleDesignGuardrails.length);

  if (!hasBasis) {
    return (
      <section className="rounded-3xl border border-dashed border-amber-300 bg-amber-50 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h2 className="font-black text-amber-950">직무설계 기준점이 아직 없습니다</h2>
            <p className="mt-2 text-sm leading-6 text-amber-800">
              관리자가 프로필을 저장하거나 다음 직무기술서를 생성하면 Gemini가 회사 사실을 분석해 기준점을 만들고 검토합니다.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-slate-950 px-6 py-6 text-white sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-300">
              <Compass className="h-5 w-5" />
              <p className="text-xs font-black uppercase tracking-[0.16em]">Company design basis</p>
            </div>
            <h2 className="mt-3 text-xl font-black">JD 설계의 회사 기준점</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              NCS가 표준 과업의 근거를 제공한다면, 이 기준점은 우리 회사에서 왜 이 직무가 필요하고 무엇을 우선해야 하는지 결정합니다.
            </p>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${isReady ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>
            {isReady ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {isReady ? "AI 검토 완료" : "사람 확인 필요"}
          </span>
        </div>
      </div>

      <div className="space-y-8 p-6 sm:p-8">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-center gap-2 text-blue-700">
            <Sparkles className="h-4 w-4" />
            <p className="text-xs font-black uppercase tracking-[0.12em]">가치 창출 논리</p>
          </div>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-800">{basis.valueCreationLogic}</p>
        </div>

        <div className="grid gap-7 lg:grid-cols-2">
          <ListBlock title="전략적 초점" items={basis.strategicFocus} />
          <ListBlock title="핵심 가치사슬" items={basis.coreValueChain} />
          <ListBlock title="핵심 역량" items={basis.criticalCapabilities} />
          <ListBlock title="핵심 프로세스" items={basis.coreProcesses} />
          <ListBlock title="운영 원칙" items={basis.operatingPrinciples} />
          <ListBlock title="조직설계 원칙" items={basis.organizationDesignPrinciples} />
          <ListBlock title="인재 우선순위" items={basis.talentPriorities} />
          <ListBlock title="직무설계 가드레일" items={basis.roleDesignGuardrails} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">NCS 탐색 앵커</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {basis.ncsSearchAnchors.map((anchor) => (
              <span key={anchor} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">{anchor}</span>
            ))}
          </div>
        </div>

        {(validation.summary || validation.findings.length > 0) && (
          <div className={`rounded-2xl border p-5 ${isReady ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <p className={`text-sm font-black ${isReady ? "text-emerald-900" : "text-amber-950"}`}>기준점 검토 결과</p>
            {validation.summary && <p className={`mt-2 text-sm leading-6 ${isReady ? "text-emerald-800" : "text-amber-800"}`}>{validation.summary}</p>}
            {validation.findings.length > 0 && (
              <ul className="mt-3 space-y-2">
                {validation.findings.map((finding, index) => (
                  <li key={index} className={`text-xs leading-5 ${isReady ? "text-emerald-800" : "text-amber-800"}`}>
                    · {finding.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
