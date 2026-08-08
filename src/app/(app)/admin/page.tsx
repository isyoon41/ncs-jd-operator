import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (!isAdmin) redirect("/");

  const { data: organizations } = await supabase
    .from("organizations")
    .select(
      "id, name, slug, created_at, organization_invites(id, token, role, is_revoked, expires_at, created_at)"
    )
    .order("created_at", { ascending: false });

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  const { data: pendingRequests } = await supabase.rpc("list_pending_access_requests");

  return (
    <AdminDashboard
      initialOrganizations={organizations ?? []}
      memberOrganizationIds={(memberships ?? []).map((item) => item.organization_id)}
      isSuperAdmin={Boolean(isAdmin)}
      initialAccessRequests={pendingRequests ?? []}
    />
  );
}
