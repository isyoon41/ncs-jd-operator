import type { ReactNode } from "react";
import { PathwayBrand, PathwayCopyright } from "@/components/brand/pathway-brand";

const FEATURES = ["팀 미션 설계", "직무 매칭", "JD 자동 생성", "근거 기반 검증"];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#101722] px-14 py-12 text-white lg:flex xl:px-16 xl:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(59,130,246,0.25), transparent 45%), radial-gradient(circle at 85% 75%, rgba(59,130,246,0.15), transparent 40%)",
          }}
        />
        <div aria-hidden className="pointer-events-none absolute -right-36 bottom-[15%] h-[520px] w-[520px] rounded-full border border-white/[0.06]" />
        <div aria-hidden className="pointer-events-none absolute -right-20 bottom-[18%] h-[410px] w-[410px] rounded-full border border-white/[0.05]" />

        <div className="relative z-10">
          <PathwayBrand tone="dark" priority />
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold tracking-[0.16em] text-slate-400">
            NCS JD GENERATOR <span className="h-1 w-1 rounded-full bg-blue-400" /> PATHWAY PRODUCT
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            팀의 미션과 R&amp;R을
            <br />
            <span className="text-blue-400">NCS 데이터로</span>
            <br />
            설계합니다
          </h1>
          <p className="max-w-sm text-slate-400">
            팀 미션 설계부터 자격요건, KPI까지 — 근거 기반 직무기술서를 하나의 플랫폼에서.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {FEATURES.map((feature) => (
              <span
                key={feature}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-slate-200"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>

        <PathwayCopyright tone="dark" className="relative z-10" />
      </div>

      <div className="flex w-full flex-1 flex-col bg-slate-50 lg:w-1/2">
        <div className="flex justify-center px-6 pt-8 lg:hidden">
          <PathwayBrand tone="light" compact priority />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 sm:py-12">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
            {children}
          </div>
        </div>
        <PathwayCopyright tone="light" className="justify-center px-6 pb-7 lg:hidden" />
      </div>
    </div>
  );
}
