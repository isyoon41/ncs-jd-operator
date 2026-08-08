import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccessibleOrganizations, resolveActiveOrgId } from "@/lib/org/active-organization";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { organizations, isSuperAdmin } = await getAccessibleOrganizations(supabase, user.id);
  const cookieStore = await cookies();
  const activeOrgId = resolveActiveOrgId(cookieStore.get("active_org_id")?.value, organizations);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppHeader email={user.email ?? ""} organizations={organizations} activeOrgId={activeOrgId} isSuperAdmin={isSuperAdmin} />
      <div className="flex-1">{children}</div>
      <AppFooter />
    </div>
  );
}
