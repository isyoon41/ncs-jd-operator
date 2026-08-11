import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth/session";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await getOrgContext();
  if (!context) redirect("/login");
  const { user, organizations, isSuperAdmin, activeOrgId } = context;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppHeader email={user.email ?? ""} organizations={organizations} activeOrgId={activeOrgId} isSuperAdmin={isSuperAdmin} />
      <div className="flex-1">{children}</div>
      <AppFooter />
    </div>
  );
}
