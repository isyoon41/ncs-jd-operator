export const adminCardClass = "rounded-xl border border-slate-200 p-4";

export const adminButtonClass = {
  primary: "rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60",
  secondary: "rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60",
  danger: "rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60",
  dangerFilled: "rounded-lg bg-red-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40",
  warning: "rounded-lg border border-amber-200 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60",
  success: "rounded-lg border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60",
  select: "rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700",
} as const;

export const adminSectionTitleClass = "text-sm font-bold text-slate-700";

export const adminTableClass = {
  wrapper: "mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white",
  table: "w-full min-w-[720px] border-collapse text-sm",
  headCell: "border-b border-slate-200 px-4 py-3 text-left text-xs font-bold text-slate-500",
  row: "border-b border-slate-100 last:border-0",
  cell: "px-4 py-3 align-middle text-slate-700",
  iconButton: "grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40",
  iconButtonDanger: "grid h-8 w-8 place-items-center rounded-lg border border-red-200 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40",
} as const;
export const adminInputClass = "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20";
