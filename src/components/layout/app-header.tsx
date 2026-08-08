"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, LogOut, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setActiveOrganization } from "@/app/(app)/actions";

type Organization = { id: string; name: string };

export function AppHeader({
  email,
  organizations,
  activeOrgId,
  isSuperAdmin,
}: {
  email: string;
  organizations: Organization[];
  activeOrgId: string | null;
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleOrgChange = (value: string) => {
    startTransition(async () => {
      await setActiveOrganization(value === "" ? null : value);
      router.refresh();
    });
  };

  const handleLogout = () => {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <Link href="/" className="block">
          <p className="text-lg font-black tracking-tight text-slate-950">NCS JD Operator</p>
          <p className="text-xs text-slate-400">근거 기반 직무기술서</p>
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          {organizations.length > 1 ? (
            <select
              value={activeOrgId ?? ""}
              onChange={(event) => handleOrgChange(event.target.value)}
              disabled={isPending}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
            >
              <option value="">전체 회사 보기</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          ) : organizations[0] ? (
            <span className="text-sm font-semibold text-slate-600">{organizations[0].name}</span>
          ) : null}
          <span className="text-sm text-slate-400">{email}</span>
          <Link href="/company" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900">
            <Building2 className="h-4 w-4" />회사 프로필
          </Link>
          {isSuperAdmin && (
            <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900">
              <ShieldCheck className="h-4 w-4" />관리
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
