import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JdCreateForm } from "@/components/jobs/jd-create-form";

export default async function NewJobPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/jobs/new");

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(id, name)")
    .eq("user_id", user.id);
  const organizations = (memberships ?? []).flatMap((membership) => membership.organizations ? [membership.organizations] : []);
  if (organizations.length === 0) redirect("/");

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, organization_id")
    .in("organization_id", organizations.map((organization) => organization.id))
    .order("name");

  return <main className="min-h-screen bg-slate-50"><div className="mx-auto max-w-6xl px-5 py-8 sm:px-8"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />대시보드</Link><div className="mb-8 mt-6"><p className="text-sm font-semibold text-blue-600">NCS 기반 직무 설계</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">새 직무기술서 만들기</h1><p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">직무의 목적과 책임을 입력하고 NCS 능력단위를 근거로 연결하세요. 우선 편집 가능한 1차 초안을 저장합니다.</p></div><JdCreateForm organizations={organizations} teams={teams ?? []} /></div></main>;
}
