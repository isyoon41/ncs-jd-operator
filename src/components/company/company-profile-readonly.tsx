import { ShieldCheck } from "lucide-react";
import { CompanyDesignBasisPanel } from "@/components/company/company-design-basis-panel";
import type { CompanyContext } from "@/lib/jd/company-designer";

function Item({ label, hint, value }: { label: string; hint?: string; value: string | string[] }) {
  const isEmpty = Array.isArray(value) ? value.length === 0 : !value.trim();
  return (
    <div>
      <p className="text-sm font-semibold text-slate-800">
        {label}
        {hint && <span className="ml-2 text-xs font-normal text-slate-400">{hint}</span>}
      </p>
      {isEmpty ? (
        <p className="mt-1.5 text-sm text-slate-400">입력된 내용이 없습니다.</p>
      ) : Array.isArray(value) ? (
        <ul className="mt-1.5 space-y-1">
          {value.map((line, index) => (
            <li key={index} className="text-sm leading-6 text-slate-700">
              · {line}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-sm leading-6 text-slate-700">{value}</p>
      )}
    </div>
  );
}

export function CompanyProfileReadonly({ profile }: { profile: CompanyContext }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-800">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <p>회사 프로필 조회 권한만 있습니다. 수정하려면 관리자에게 요청해 주세요.</p>
      </div>

      <CompanyDesignBasisPanel basis={profile.designBasis} validation={profile.basisValidation} />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-black text-slate-900">회사 개요</h2>
        <div className="mt-5 space-y-5">
          <Item label="요약" value={profile.summary} />
          <div className="grid gap-5 md:grid-cols-2">
            <Item label="사업 영역" value={profile.businessAreas} />
            <Item label="제품·서비스" value={profile.productsServices} />
            <Item label="주요 고객" value={profile.customers} />
            <Item label="성장 단계" value={profile.growthStage} />
          </div>
          <Item label="비즈니스 모델·수익구조" value={profile.businessModel} />
          <Item label="회사 운영 방식" value={profile.operatingModel} />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-black text-slate-900">미션·비전·핵심가치</h2>
        <div className="mt-5 space-y-5">
          <Item label="미션" value={profile.mission} />
          <Item label="비전" value={profile.vision} />
          <Item label="핵심가치" value={profile.coreValues} />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-black text-slate-900">가치사슬·기술·사업 제약</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Item label="핵심 가치사슬" value={profile.valueChain} />
          <Item label="핵심 기술·데이터·보유 자산" value={profile.technologyAssets} />
          <Item label="차별화 요소" value={profile.differentiators} />
          <Item label="규제·품질·사업 제약" value={profile.regulatoryConstraints} />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-black text-slate-900">전략·조직</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Item label="전략 우선순위" value={profile.strategicPriorities} />
          <Item label="조직 문화" value={profile.culture} />
          <Item label="핵심 용어" value={profile.keyTerms} />
          <Item label="확인되지 않은 사항" value={profile.uncertainties} />
        </div>
      </section>
    </div>
  );
}
