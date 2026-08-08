import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, ArrowRight, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAccessibleOrganizations, resolveActiveOrgId } from "@/lib/org/active-organization";
import { CompanyProfileForm } from "@/components/company/company-profile-form";
import type { CompanyContext } from "@/lib/jd/company-designer";

export default async function CompanyProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/company");

  const { organizations } = await getAccessibleOrganizations(supabase, user.id);
  if (organizations.length === 0) redirect("/");
  const cookieStore = await cookies();
  const activeOrgId = resolveActiveOrgId(cookieStore.get("active_org_id")?.value, organizations);
  const organization = organizations.find((item) => item.id === activeOrgId) ?? organizations[0];

  const { data: latestProfiles } = await supabase
    .from("organization_profiles")
    .select("version_no, structured_context")
    .eq("organization_id", organization.id)
    .order("version_no", { ascending: false })
    .limit(1);
  const latestProfile = latestProfiles?.[0];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />대시보드</Link>
        <div className="mb-8 mt-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">Company profile</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{organization.name} 회사 프로필</h1>
            {latestProfile && <p className="mt-2 text-sm text-slate-500">현재 v{latestProfile.version_no} · 저장하면 새 버전이 만들어집니다.</p>}
          </div>
          {organizations.length > 1 && <p className="shrink-0 text-xs text-slate-400">헤더의 회사 전환으로 다른 회사를 선택할 수 있습니다.</p>}
        </div>

        {latestProfile ? (
          <CompanyProfileForm organizationId={organization.id} profile={latestProfile.structured_context as unknown as CompanyContext} />
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <Building2 className="mx-auto h-8 w-8 text-slate-300" />
            <h3 className="mt-4 font-bold text-slate-800">아직 회사 프로필이 없습니다</h3>
            <p className="mt-2 text-sm text-slate-400">직무설계를 처음 만들 때 회사 소개를 입력하면 프로필이 만들어지고, 그 이후부터 여기서 직접 수정할 수 있습니다.</p>
            <Link href="/jobs/new" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-600">직무설계 시작하기<ArrowRight className="h-4 w-4" /></Link>
          </div>
        )}
      </div>
    </main>
  );
}
