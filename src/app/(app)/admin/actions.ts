"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminActionState = { error: string | null };

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };
  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  return { supabase, user, isAdmin: Boolean(isAdmin) };
}

export async function setMembershipStatus(memberId: string, status: "active" | "held"): Promise<AdminActionState> {
  const { supabase, isAdmin } = await requirePlatformAdmin();
  if (!isAdmin) return { error: "관리자 권한이 없습니다." };

  const { error } = await supabase.from("organization_members").update({ status }).eq("id", memberId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function suspendUserAccount(userId: string): Promise<AdminActionState> {
  const { isAdmin } = await requirePlatformAdmin();
  if (!isAdmin) return { error: "관리자 권한이 없습니다." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
  if (error) return { error: error.message };
  return { error: null };
}

export async function reactivateUserAccount(userId: string): Promise<AdminActionState> {
  const { isAdmin } = await requirePlatformAdmin();
  if (!isAdmin) return { error: "관리자 권한이 없습니다." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteUserAccount(userId: string): Promise<AdminActionState> {
  const { user, isAdmin } = await requirePlatformAdmin();
  if (!isAdmin) return { error: "관리자 권한이 없습니다." };
  if (user?.id === userId) return { error: "자기 자신의 계정은 삭제할 수 없습니다." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  return { error: null };
}
