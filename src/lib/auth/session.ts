import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  getAccessibleOrganizations,
  resolveActiveOrgId,
  type AccessibleOrganization,
} from "@/lib/org/active-organization";

// supabase.auth.getUser()는 쿠키 읽기가 아니라 인증 서버로 나가는 네트워크 호출이다.
// 레이아웃과 페이지가 각자 호출하면 한 요청에 같은 왕복이 여러 번 생기므로,
// React cache()로 감싸 렌더 패스당 한 번만 나가게 한다.
export const getSessionUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export type OrgContext = {
  user: User;
  organizations: AccessibleOrganization[];
  isSuperAdmin: boolean;
  activeOrgId: string | null;
};

// 로그인 사용자 + 접근 가능한 회사 + 활성 회사를 한 번에 해석한다.
// resolveActiveOrgId가 status를 직접 확인하므로 organizations를 미리 거를 필요는 없다.
export const getOrgContext = cache(async (): Promise<OrgContext | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const { organizations, isSuperAdmin } = await getAccessibleOrganizations(supabase, user.id);
  const cookieStore = await cookies();
  const activeOrgId = resolveActiveOrgId(cookieStore.get("active_org_id")?.value, organizations);

  return { user, organizations, isSuperAdmin, activeOrgId };
});
