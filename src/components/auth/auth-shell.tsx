import type { ReactNode } from "react";

const FEATURES = ["팀 미션 설계", "직무 매칭", "JD 자동 생성", "근거 기반 검증"];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-slate-950 px-16 py-14 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(59,130,246,0.25), transparent 45%), radial-gradient(circle at 85% 75%, rgba(59,130,246,0.15), transparent 40%)",
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M4 7a2 2 0 0 1 2-2h3l1-2h4l1 2h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M4 11h16" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide">NCS JD GENERATOR</p>
            <p className="text-xs text-slate-400">근거 기반 직무기술서 플랫폼</p>
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

        <p className="relative z-10 text-xs text-slate-500">
          © {new Date().getFullYear()} NCS JD Generator. All rights reserved.
        </p>
      </div>

      <div className="flex w-full flex-1 items-center justify-center bg-white px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
