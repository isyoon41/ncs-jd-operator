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

export async function setMembershipRole(
  memberId: string,
  role: "owner" | "admin" | "member",
): Promise<AdminActionState> {
  const { supabase, isAdmin } = await requirePlatformAdmin();
  if (!isAdmin) return { error: "관리자 권한이 없습니다." };

  const { error } = await supabase.from("organization_members").update({ role }).eq("id", memberId);
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

export async function changeUserOrganization(
  userId: string,
  targetOrgId: string | null,
  role: "owner" | "admin" | "member" = "member",
): Promise<AdminActionState> {
  const { supabase, isAdmin } = await requirePlatformAdmin();
  if (!isAdmin) return { error: "관리자 권한이 없습니다." };

  // 플랫폼 운영자는 소속과 무관하게 모든 회사에 접근한다. 소속을 붙이면 권한은 그대로인 채
  // 관리 화면에서만 특정 회사 사용자처럼 보이게 되므로 아예 막는다.
  if (targetOrgId) {
    const admin = createAdminClient();
    const { data: platformAdmin } = await admin
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (platformAdmin) return { error: "플랫폼 운영자 계정은 소속 회사를 가질 수 없습니다." };
  }

  const { error: deleteError } = await supabase.from("organization_members").delete().eq("user_id", userId);
  if (deleteError) return { error: deleteError.message };

  if (targetOrgId) {
    const { error: insertError } = await supabase
      .from("organization_members")
      .insert({ organization_id: targetOrgId, user_id: userId, role });
    if (insertError) return { error: insertError.message };
  }
  return { error: null };
}

function slugify(name: string) {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || `org-${Date.now()}`;
}

export async function approveAccessRequestWithNewOrg(requestId: string, companyName: string): Promise<AdminActionState> {
  const { supabase, isAdmin } = await requirePlatformAdmin();
  if (!isAdmin) return { error: "관리자 권한이 없습니다." };
  if (!companyName.trim()) return { error: "회사명을 입력해 주세요." };

  const { data: newOrgId, error: createError } = await supabase.rpc("create_organization_as_admin", {
    org_name: companyName,
    org_slug: slugify(companyName),
  });
  if (createError) return { error: createError.message };

  const { error: approveError } = await supabase.rpc("approve_access_request", {
    request_id: requestId,
    target_org_id: newOrgId as string,
  });
  if (approveError) return { error: approveError.message };
  return { error: null };
}
