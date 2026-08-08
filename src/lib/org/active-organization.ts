import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type AccessibleOrganization = { id: string; name: string; slug: string; memberRole: string };

export async function getAccessibleOrganizations(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ organizations: AccessibleOrganization[]; isSuperAdmin: boolean }> {
  const { data: isSuperAdmin } = await supabase.rpc("is_platform_admin");
  const organizations: AccessibleOrganization[] = isSuperAdmin
    ? ((await supabase.from("organizations").select("id, name, slug").order("name")).data ?? [])
        .map((organization) => ({ ...organization, memberRole: "super_admin" }))
    : ((await supabase
        .from("organization_members")
        .select("organization_id, role, organizations(id, name, slug)")
        .eq("user_id", userId)).data ?? [])
        .flatMap((membership) =>
          membership.organizations ? [{ ...membership.organizations, memberRole: membership.role }] : [],
        );
  return { organizations, isSuperAdmin: Boolean(isSuperAdmin) };
}

export function resolveActiveOrgId(
  cookieValue: string | undefined,
  organizations: AccessibleOrganization[],
): string | null {
  if (!cookieValue) return null;
  return organizations.some((organization) => organization.id === cookieValue) ? cookieValue : null;
}
