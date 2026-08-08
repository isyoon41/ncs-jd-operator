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

export async function confirmRole(roleId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("team_roles").update({ status: "approved" }).eq("id", roleId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteRole(roleId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("team_roles").delete().eq("id", roleId);
  if (error) return { error: error.message };
  return { error: null };
}
