import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function PageHeader({
  backHref,
  backLabel = "대시보드",
  eyebrow,
  title,
  description,
  action,
}: {
  backHref?: string;
  backLabel?: string;
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      {backHref && (
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      )}
      <div className={`flex flex-wrap items-end justify-between gap-4 ${backHref ? "mt-6" : ""}`}>
        <div>
          <p className="text-sm font-semibold text-blue-600">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
          {description && <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
