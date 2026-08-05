import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JdCreateForm } from "@/components/jobs/jd-create-form";

export const maxDuration = 300;

export default async function NewJobPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/jobs/new");

  const { data: isSuperAdmin } = await supabase.rpc("is_platform_admin");
  const organizations = isSuperAdmin
    ? ((await supabase.from("organizations").select("id, name").order("name")).data ?? [])
    : ((await supabase
        .from("organization_members")
        .select("organization_id, organizations(id, name)")
        .eq("user_id", user.id)).data ?? [])
        .flatMap((membership) => membership.organizations ? [membership.organizations] : []);
  if (organizations.length === 0) redirect("/");

  const { data: profileRows } = await supabase
    .from("organization_profiles")
    .select("organization_id, version_no, summary")
    .in("organization_id", organizations.map((organization) => organization.id))
    .order("version_no", { ascending: false });
  const profiles = [...new Map((profileRows ?? []).map((profile) => [profile.organization_id, profile])).values()];

  return <main className="min-h-screen bg-slate-50"><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />대시보드</Link><div className="mb-8 mt-6"><p className="text-sm font-semibold text-blue-600">Company-grounded job design</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">회사 이해에서 시작하는 직무설계</h1><p className="mt-3 max-w-3xl text-base leading-7 text-slate-500">회사 소개자료와 간단한 팀 역할만 알려주세요. Gemini가 회사를 이해하고 NCS로 근거를 검토해 바로 사용할 수 있는 직무기술서 v1.0을 만듭니다.</p></div><JdCreateForm organizations={organizations} profiles={profiles} /></div></main>;
}
