"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  GEMINI_MODEL,
  refreshCompanyDesignBasis,
  type CompanyContext,
  type CompanyFact,
} from "@/lib/jd/company-designer";
import { checkAiGenerationRateLimit, recordAiGenerationEvent } from "@/lib/jd/rate-limit";
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

  const { data: canManage } = await supabase.rpc("is_org_admin", { target_org_id: organizationId });
  if (!canManage) return { error: "회사 프로필 수정은 관리자만 할 수 있습니다." };

  const summary = value(formData, "summary", 2000);
  const mission = value(formData, "mission", 1000);
  if (!summary || !mission) return { error: "요약과 미션은 비워둘 수 없습니다." };

  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .maybeSingle();
  if (!organization) return { error: "회사를 찾을 수 없습니다." };

  const rateLimit = await checkAiGenerationRateLimit(supabase, organizationId, user.id);
  if (!rateLimit.allowed) return { error: rateLimit.message };

  const baseContext: Omit<CompanyContext, "facts" | "designBasis" | "basisValidation"> = {
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
    valueChain: lines(formData, "valueChain", 12),
    technologyAssets: lines(formData, "technologyAssets", 12),
    regulatoryConstraints: lines(formData, "regulatoryConstraints", 12),
    operatingModel: lines(formData, "operatingModel", 12),
    differentiators: lines(formData, "differentiators", 12),
    keyTerms: lines(formData, "keyTerms", 16),
    uncertainties: lines(formData, "uncertainties", 8),
  };

  const facts: CompanyFact[] = [
    { category: "회사 개요", statement: baseContext.summary, basis: "stated" as const, confidence: "high" as const },
    { category: "미션", statement: baseContext.mission, basis: "stated" as const, confidence: "high" as const },
    ...baseContext.businessAreas.map((statement) => ({ category: "사업 영역", statement, basis: "stated" as const, confidence: "high" as const })),
    ...baseContext.productsServices.map((statement) => ({ category: "제품·서비스", statement, basis: "stated" as const, confidence: "high" as const })),
    ...baseContext.customers.map((statement) => ({ category: "고객", statement, basis: "stated" as const, confidence: "high" as const })),
    ...baseContext.valueChain.map((statement) => ({ category: "가치사슬", statement, basis: "stated" as const, confidence: "high" as const })),
    ...baseContext.technologyAssets.map((statement) => ({ category: "기술·자산", statement, basis: "stated" as const, confidence: "high" as const })),
    ...baseContext.regulatoryConstraints.map((statement) => ({ category: "규제·제약", statement, basis: "stated" as const, confidence: "high" as const })),
    ...baseContext.differentiators.map((statement) => ({ category: "차별화", statement, basis: "stated" as const, confidence: "high" as const })),
  ].filter((fact) => fact.statement);

  const { data: latestProfiles } = await supabase
    .from("organization_profiles")
    .select("version_no, source_ids")
    .eq("organization_id", organizationId)
    .order("version_no", { ascending: false })
    .limit(1);
  const latestProfile = latestProfiles?.[0];

  let structuredContext: CompanyContext;
  try {
    await recordAiGenerationEvent(supabase, organizationId, user.id, "refine");
    structuredContext = await refreshCompanyDesignBasis({
      organizationName: organization.name,
      company: {
        ...baseContext,
        facts,
        designBasis: {
          valueCreationLogic: "",
          strategicFocus: [],
          coreValueChain: [],
          criticalCapabilities: [],
          coreProcesses: [],
          operatingPrinciples: [],
          organizationDesignPrinciples: [],
          talentPriorities: [],
          roleDesignGuardrails: [],
          ncsSearchAnchors: [],
        },
        basisValidation: { status: "needs_review", summary: "", findings: [] },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return { error: `회사 직무설계 기준점을 만들지 못했습니다: ${message.slice(0, 400)}` };
  }

  const { error } = await supabase.from("organization_profiles").insert({
    organization_id: organizationId,
    version_no: (latestProfile?.version_no ?? 0) + 1,
    summary,
    structured_context: structuredContext as unknown as Json,
    source_ids: latestProfile?.source_ids ?? [],
    model: GEMINI_MODEL,
    created_by: user.id,
  });
  if (error) return { error: `회사 프로필을 저장하지 못했습니다: ${error.message}` };

  redirect("/company");
}
