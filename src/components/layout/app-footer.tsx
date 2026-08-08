import { PathwayBrand } from "@/components/brand/pathway-brand";

export function AppFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <PathwayBrand tone="dark" compact />
          <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-slate-600">A Pathway Partners product</p>
        </div>
        <div className="text-left text-xs leading-5 text-slate-500 sm:text-right">
          <p className="font-semibold text-slate-400">NCS JD Operator</p>
          <p>Copyright © PATHWAY Partners Co., Ltd. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
