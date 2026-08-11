import { PageContainer } from "@/components/layout/page-container";

export default function AppLoading() {
  return (
    <PageContainer>
      <div className="animate-pulse">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="mt-3 h-9 w-80 max-w-full rounded bg-slate-200" />
        <div className="mt-3 h-4 w-full max-w-2xl rounded bg-slate-100" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-36 rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
