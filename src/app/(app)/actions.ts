"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function setActiveOrganization(organizationId: string | null) {
  const cookieStore = await cookies();
  if (organizationId) {
    cookieStore.set("active_org_id", organizationId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  } else {
    cookieStore.delete("active_org_id");
  }
}

async function requireRoleManageAccess(roleId: string) {
  const supabase = await createClient();
  const { data: role } = await supabase
    .from("team_roles")
    .select("id, teams(organization_id)")
    .eq("id", roleId)
    .maybeSingle();
  if (!role?.teams?.organization_id) return { supabase, error: "직무설계를 찾을 수 없습니다." };

  const { data: canManage } = await supabase.rpc("is_org_admin", { target_org_id: role.teams.organization_id });
  if (!canManage) return { supabase, error: "확정·삭제는 관리자만 할 수 있습니다." };

  return { supabase, error: null };
}

export async function confirmRole(roleId: string): Promise<{ error: string | null }> {
  const { supabase, error: accessError } = await requireRoleManageAccess(roleId);
  if (accessError) return { error: accessError };

  const { error } = await supabase.from("team_roles").update({ status: "approved" }).eq("id", roleId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteRole(roleId: string): Promise<{ error: string | null }> {
  const { supabase, error: accessError } = await requireRoleManageAccess(roleId);
  if (accessError) return { error: accessError };

  const { error } = await supabase.from("team_roles").delete().eq("id", roleId);
  if (error) return { error: error.message };
  return { error: null };
}
