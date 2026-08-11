"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Building2, LoaderCircle, LogOut, ShieldCheck } from "lucide-react";
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
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  // 서버 왕복이 끝나기 전에도 고른 회사가 바로 보이도록 한다.
  // (제어 컴포넌트라 이게 없으면 선택이 이전 값으로 되돌아갔다 늦게 바뀐다)
  const [optimisticOrgId, setOptimisticOrgId] = useOptimistic(activeOrgId);

  const handleOrgChange = (value: string) => {
    const nextOrgId = value === "" ? null : value;
    startTransition(async () => {
      setOptimisticOrgId(nextOrgId);
      await setActiveOrganization(nextOrgId);
      // 관리자 화면은 전체 회사를 보여주므로 회사를 바꿔도 화면이 달라지지 않는다.
      // 선택이 결과로 이어지도록 해당 회사의 대시보드로 이동한다.
      if (pathname.startsWith("/admin")) {
        router.push("/");
      } else {
        router.refresh();
      }
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
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <Image src="/brand/pathway-partners-mark.png" alt="" width={294} height={268} className="h-full w-full object-contain" priority />
          </span>
          <span className="block">
            <span className="block text-lg font-black tracking-tight text-slate-950">NCS JD Operator</span>
            <span className="mt-0.5 block text-[10px] font-bold tracking-[0.14em] text-[#806744]">A PATHWAY PARTNERS PRODUCT</span>
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          {organizations.length > 1 ? (
            <span className="flex items-center gap-2">
              {isPending && <LoaderCircle className="h-4 w-4 animate-spin text-slate-400" />}
              <select
                value={optimisticOrgId ?? ""}
                onChange={(event) => handleOrgChange(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
              >
                <option value="">전체 회사 보기</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </span>
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
