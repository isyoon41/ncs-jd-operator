"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, LoaderCircle, Trash2 } from "lucide-react";
import { confirmRole, deleteRole } from "@/app/(app)/actions";

const statusLabel: Record<string, string> = {
  draft: "초안",
  in_review: "검토중",
  approved: "확정",
  archived: "보관",
};

export function RoleCard({
  role,
  showConfirm,
}: {
  role: { id: string; title: string; status: string; seniority_hint: string | null; teamName: string; organizationName?: string };
  showConfirm: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleConfirm(event: React.MouseEvent) {
    event.preventDefault();
    startTransition(async () => {
      await confirmRole(role.id);
      router.refresh();
    });
  }

  function handleDelete(event: React.MouseEvent) {
    event.preventDefault();
    if (!window.confirm(`"${role.title}"을(를) 삭제하시겠어요? 되돌릴 수 없습니다.`)) return;
    startTransition(async () => {
      await deleteRole(role.id);
      router.refresh();
    });
  }

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <Link href={`/jobs/${role.id}`} className="block">
        <div className="flex items-center justify-between">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              role.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {statusLabel[role.status] ?? role.status}
          </span>
          <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-900">{role.title}</h3>
        <p className="mt-1 text-sm text-slate-400">
          {role.organizationName} · {role.teamName}
        </p>
        {role.seniority_hint && <p className="mt-4 text-xs font-medium text-slate-500">{role.seniority_hint}</p>}
      </Link>
      <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
        {showConfirm && (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            확정
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-60 ${
            showConfirm ? "" : "flex-1"
          }`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          삭제
        </button>
      </div>
    </div>
  );
}
