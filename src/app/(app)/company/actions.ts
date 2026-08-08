"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CompanyContext } from "@/lib/jd/company-designer";
import type { Json } from "@/lib/supabase/database.types";

export type UpdateCompanyProfileState = { error: string | null };

const value = (formData: FormData, key: string, max = 3000) =>
  String(formData.get(key) ?? "").trim().slice(0, max);

const lines = (formData: FormData, key: string, max = 20) =>
  String(formData.get(key) ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);

export async function updateCompanyProfile(
  organizationId: string,
  _previousState: UpdateCompanyProfileState,
  formData: FormData,
): Promise<UpdateCompanyProfileState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/company");

  const { data: canAccess } = await supabase.rpc("is_org_member", { target_org_id: organizationId });
  if (!canAccess) return { error: "이 회사의 프로필을 수정할 권한이 없습니다." };

  const summary = value(formData, "summary", 2000);
  const mission = value(formData, "mission", 1000);
  if (!summary || !mission) return { error: "요약과 미션은 비워둘 수 없습니다." };

  const structuredContext: CompanyContext = {
    summary,
    mission,
    vision: value(formData, "vision", 1000),
    coreValues: lines(formData, "coreValues", 6),
    mvcBasis: "stated",
    businessAreas: lines(formData, "businessAreas", 8),
    productsServices: lines(formData, "productsServices", 10),
    customers: lines(formData, "customers", 8),
    businessModel: value(formData, "businessModel", 1000),
    growthStage: value(formData, "growthStage", 200),
    strategicPriorities: lines(formData, "strategicPriorities", 8),
    culture: lines(formData, "culture", 8),
    keyTerms: lines(formData, "keyTerms", 16),
    uncertainties: lines(formData, "uncertainties", 8),
  };

  const { data: latestProfiles } = await supabase
    .from("organization_profiles")
    .select("version_no, source_ids")
    .eq("organization_id", organizationId)
    .order("version_no", { ascending: false })
    .limit(1);
  const latestProfile = latestProfiles?.[0];

  const { error } = await supabase.from("organization_profiles").insert({
    organization_id: organizationId,
    version_no: (latestProfile?.version_no ?? 0) + 1,
    summary,
    structured_context: structuredContext as unknown as Json,
    source_ids: latestProfile?.source_ids ?? [],
    model: "manual_edit",
    created_by: user.id,
  });
  if (error) return { error: `회사 프로필을 저장하지 못했습니다: ${error.message}` };

  redirect("/company");
}
