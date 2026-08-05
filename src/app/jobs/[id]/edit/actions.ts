"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import {
  GEMINI_MODEL,
  planNcsSearch,
  retrieveNcsCandidates,
  validateGroundedDesign,
  type CompanyContext,
  type GroundedItem,
  type NcsCandidate,
  type TeamDesign,
} from "@/lib/jd/company-designer";
import { checkAiGenerationRateLimit, recordAiGenerationEvent } from "@/lib/jd/rate-limit";
import { confidenceForMatchStrength } from "@/lib/jd/text-utils";

export type RefineJdState = { error: string | null };

const value = (formData: FormData, key: string, max = 5000) =>
  String(formData.get(key) ?? "").trim().slice(0, max);

const lines = (formData: FormData, key: string, max = 30) =>
  String(formData.get(key) ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);

function jsonRecord(input: Json): Record<string, Json | undefined> {
  return input && typeof input === "object" && !Array.isArray(input) ? input : {};
}

function jsonStrings(input: Json | undefined): string[] {
  return Array.isArray(input) ? input.filter((item): item is string => typeof item === "string") : [];
}

function jsonObjects(input: Json | undefined): Array<Record<string, Json | undefined>> {
  return Array.isArray(input)
    ? input.filter((item): item is Record<string, Json | undefined> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

const grounded = (items: string[]): GroundedItem[] =>
  items.map((content) => ({ content, ncsCodes: [], basis: "team_input" }));

export async function refineJdDraft(
  roleId: string,
  _previousState: RefineJdState,
  formData: FormData,
): Promise<RefineJdState> {
  const teamMission = value(formData, "teamMission", 3000);
  const teamOutputs = lines(formData, "teamOutputs", 12);
  const teamResponsibilities = lines(formData, "teamResponsibilities", 15);
  const roleTitle = value(formData, "roleTitle", 100);
  const mission = value(formData, "mission", 3000);
  const outputs = lines(formData, "outputs", 12);
  const responsibilities = lines(formData, "responsibilities", 20);
  const requiredQualifications = lines(formData, "requiredQualifications", 15);
  const preferredQualifications = lines(formData, "preferredQualifications", 15);
  const tools = lines(formData, "tools", 15);
  const stakeholders = lines(formData, "stakeholders", 15);
  const kpiLines = lines(formData, "kpis", 12);
  const suggestedRoleTitles = lines(formData, "suggestedRoles", 10);

  if (!teamMission || !roleTitle || !mission || responsibilities.length === 0) {
    return { error: "팀 미션, 직무명, 직무 미션과 주요 책임은 비워둘 수 없습니다." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/jobs/${roleId}/edit`);

  const { data: role } = await supabase
    .from("team_roles")
    .select("id, title, intake, team_id, teams(id, name, mission, charter, organization_id, organizations(id, name))")
    .eq("id", roleId)
    .maybeSingle();
  if (!role?.teams?.organizations) return { error: "수정할 직무 또는 회사 정보를 찾을 수 없습니다." };

  const { data: canAccess } = await supabase.rpc("is_org_member", { target_org_id: role.teams.organization_id });
  if (!canAccess) return { error: "이 직무를 수정할 권한이 없습니다." };

  const rateLimit = await checkAiGenerationRateLimit(supabase, role.teams.organization_id, user.id);
  if (!rateLimit.allowed) return { error: rateLimit.message };

  const { data: versions } = await supabase
    .from("jd_versions")
    .select("id, version_no, version_major, version_minor, organization_profile_id, design_snapshot")
    .eq("team_role_id", roleId)
    .order("version_no", { ascending: false })
    .limit(1);
  const latestVersion = versions?.[0];
  if (!latestVersion?.organization_profile_id) return { error: "회사 프로필이 연결된 v1.0부터 보완할 수 있습니다." };
  if (latestVersion.version_major === 1 && latestVersion.version_minor >= 1) {
    return { error: "v1.1 검토가 이미 완료되었습니다. 새 직무를 설계하려면 대시보드의 새 직무설계를 이용해 주세요." };
  }

  const { data: profile } = await supabase
    .from("organization_profiles")
    .select("structured_context")
    .eq("id", latestVersion.organization_profile_id)
    .maybeSingle();
  if (!profile) return { error: "직무설계에 사용한 회사 프로필을 찾을 수 없습니다." };
  const company = profile.structured_context as unknown as CompanyContext;
  const intake = jsonRecord(role.intake);
  const teamCharter = jsonRecord(role.teams.charter);
  const teamRole = typeof intake.teamRole === "string"
    ? intake.teamRole
    : typeof teamCharter.inputRole === "string"
      ? teamCharter.inputRole
      : teamMission;

  try {
    await recordAiGenerationEvent(supabase, role.teams.organization_id, user.id, "refine");

    const additionalContext = [teamMission, ...teamOutputs, ...teamResponsibilities, mission, ...outputs, ...responsibilities, ...requiredQualifications, ...preferredQualifications, ...tools, ...stakeholders].join("\n");
    const plan = await planNcsSearch({
      company,
      teamName: role.teams.name,
      teamRole,
      roleTitleHint: roleTitle,
      additionalContext,
    });
    const retrieved = await retrieveNcsCandidates(supabase, plan);
    const { data: previousMappings } = await supabase
      .from("role_ncs_mappings")
      .select("match_strength, rationale, matched_inputs, ncs_competency_units(id, ncs_code, name, level, definition, lclas_name, mclas_name, sclas_name, subd_name)")
      .eq("jd_version_id", latestVersion.id)
      .eq("status", "accepted");
    const previousCandidates: NcsCandidate[] = (previousMappings ?? []).flatMap((mapping) => {
      const unit = mapping.ncs_competency_units;
      return unit ? [{
        id: unit.id,
        ncsCode: unit.ncs_code,
        name: unit.name,
        level: unit.level,
        definition: unit.definition,
        lclasName: unit.lclas_name,
        mclasName: unit.mclas_name,
        sclasName: unit.sclas_name,
        subdName: unit.subd_name,
      }] : [];
    });
    const candidates = [...new Map([...retrieved, ...previousCandidates].map((candidate) => [candidate.id, candidate])).values()].slice(0, 60);

    const snapshot = jsonRecord(latestVersion.design_snapshot);
    const previousSuggestedRoles = jsonObjects(snapshot.suggestedRoles).flatMap((item) => {
      const title = typeof item.title === "string" ? item.title : null;
      const purpose = typeof item.purpose === "string" ? item.purpose : teamRole;
      return title ? [{ title, purpose }] : [];
    });
    const suggestedRoles = suggestedRoleTitles.length > 0
      ? suggestedRoleTitles.map((title) => ({ title, purpose: `${role.teams.name}의 핵심 기능을 수행` }))
      : previousSuggestedRoles.length > 0
        ? previousSuggestedRoles
        : [{ title: roleTitle, purpose: mission }];
    const previousMappingDetails = new Map((previousMappings ?? []).flatMap((mapping) => {
      const unit = mapping.ncs_competency_units;
      if (!unit) return [];
      const matchStrength = ["high", "medium", "low"].includes(mapping.match_strength)
        ? mapping.match_strength as "high" | "medium" | "low"
        : "medium";
      return [[unit.ncs_code, {
        ncsCode: unit.ncs_code,
        rationale: mapping.rationale,
        matchStrength,
        matchedInputs: jsonStrings(mapping.matched_inputs),
      }]];
    }));
    const draft: TeamDesign = {
      teamMission,
      teamOutputs,
      teamResponsibilities,
      stakeholders,
      suggestedRoles,
      primaryRole: {
        title: roleTitle,
        mission,
        outputs,
        responsibilities: grounded(responsibilities),
        requiredQualifications: grounded(requiredQualifications),
        preferredQualifications: grounded(preferredQualifications),
        tools,
        stakeholders,
        kpis: kpiLines.map((name) => ({
          name,
          measure: "회사 내부 데이터로 측정 기준 확정",
          cadence: "회사 운영 주기에 맞춰 확정",
          targetGuide: "현재 기준선을 확인한 뒤 목표 설정",
          rationale: "사용자가 v1.1 보완 정보로 입력",
        })),
      },
      ncsMappings: [...previousMappingDetails.values()],
    };
    const validation = await validateGroundedDesign({
      organizationName: role.teams.organizations.name,
      company,
      teamName: role.teams.name,
      teamRole,
      roleTitleHint: roleTitle,
      candidates,
      design: draft,
      revisionLabel: "v1.1",
    });
    const design = validation.design;

    const nextMinor = latestVersion.version_minor + 1;
    const { data: newVersion, error: versionError } = await supabase
      .from("jd_versions")
      .insert({
        team_role_id: roleId,
        version_no: latestVersion.version_no + 1,
        version_major: latestVersion.version_major,
        version_minor: nextMinor,
        revision_kind: "user_refinement",
        organization_profile_id: latestVersion.organization_profile_id,
        design_snapshot: design as unknown as Json,
        status: "draft",
        source: design.ncsMappings.length > 0 ? "ncs" : "user_input",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (versionError) return { error: `v1.${nextMinor} 버전을 만들지 못했습니다: ${versionError.message}` };

    const removeVersion = async (message: string) => {
      await supabase.from("jd_versions").delete().eq("id", newVersion.id);
      return { error: message };
    };
    const commonMetadata = { generated: true, generator: GEMINI_MODEL, semanticVersion: `${latestVersion.version_major}.${nextMinor}`, refinedFromVersion: latestVersion.version_no };
    const sectionRows = [
      { kind: "mission" as const, content: design.primaryRole.mission, position: 0, metadata: commonMetadata },
      ...design.primaryRole.responsibilities.map((item, index) => ({ kind: "responsibility" as const, content: item.content, position: 100 + index, metadata: { ...commonMetadata, basis: item.basis, ncsCodes: item.ncsCodes } })),
      ...design.primaryRole.requiredQualifications.map((item, index) => ({ kind: "qualification_required" as const, content: item.content, position: 200 + index, metadata: { ...commonMetadata, basis: item.basis, ncsCodes: item.ncsCodes } })),
      ...design.primaryRole.preferredQualifications.map((item, index) => ({ kind: "qualification_preferred" as const, content: item.content, position: 300 + index, metadata: { ...commonMetadata, basis: item.basis, ncsCodes: item.ncsCodes } })),
      ...design.primaryRole.kpis.map((item, index) => ({ kind: "kpi" as const, content: item.name, position: 400 + index, metadata: { ...commonMetadata, measure: item.measure, cadence: item.cadence, targetGuide: item.targetGuide, rationale: item.rationale } })),
    ].map((section) => ({ ...section, jd_version_id: newVersion.id, metadata: section.metadata as Json }));
    const { data: savedSections, error: sectionError } = await supabase
      .from("jd_sections")
      .insert(sectionRows)
      .select("id, kind, position");
    if (sectionError) return removeVersion(`v1.${nextMinor} 내용을 저장하지 못했습니다: ${sectionError.message}`);

    const candidateByCode = new Map(candidates.map((candidate) => [candidate.ncsCode, candidate]));
    const groundedGroups: Array<{ kind: "responsibility" | "qualification_required" | "qualification_preferred"; items: GroundedItem[] }> = [
      { kind: "responsibility", items: design.primaryRole.responsibilities },
      { kind: "qualification_required", items: design.primaryRole.requiredQualifications },
      { kind: "qualification_preferred", items: design.primaryRole.preferredQualifications },
    ];
    const evidenceRows = groundedGroups.flatMap(({ kind, items }) => {
      const groupSections = savedSections.filter((section) => section.kind === kind).sort((a, b) => a.position - b.position);
      return items.flatMap((item, index) => {
        const section = groupSections[index];
        if (!section) return [];
        const ncsEvidence = item.ncsCodes.flatMap((code) => {
          const candidate = candidateByCode.get(code);
          const mapping = design.ncsMappings.find((entry) => entry.ncsCode === code);
          return candidate ? [{
            jd_section_id: section.id,
            source: "ncs" as const,
            ncs_competency_unit_id: candidate.id,
            snippet: mapping?.rationale ?? `${candidate.name}과 연결`,
            confidence: confidenceForMatchStrength(mapping?.matchStrength),
          }] : [];
        });
        return [...ncsEvidence, {
          jd_section_id: section.id,
          source: "user_input" as const,
          ncs_competency_unit_id: null,
          snippet: "사용자가 보완한 정보와 회사·팀 맥락을 근거로 재검토",
          confidence: null,
        }];
      });
    });
    const missionSection = savedSections.find((section) => section.kind === "mission");
    if (missionSection) evidenceRows.push({
      jd_section_id: missionSection.id,
      source: "user_input",
      ncs_competency_unit_id: null,
      snippet: "사용자가 보완한 팀·직무 미션을 회사 프로필과 대조",
      confidence: null,
    });
    if (evidenceRows.length > 0) {
      const { error } = await supabase.from("jd_evidence").insert(evidenceRows);
      if (error) return removeVersion(`v1.${nextMinor} 근거를 저장하지 못했습니다: ${error.message}`);
    }

    const mappingRows = design.ncsMappings.flatMap((mapping) => {
      const candidate = candidateByCode.get(mapping.ncsCode);
      return candidate ? [{
        team_role_id: roleId,
        jd_version_id: newVersion.id,
        ncs_competency_unit_id: candidate.id,
        status: "accepted",
        match_strength: mapping.matchStrength,
        rationale: mapping.rationale,
        matched_inputs: mapping.matchedInputs as Json,
        model: GEMINI_MODEL,
      }] : [];
    });
    if (mappingRows.length > 0) {
      const { error } = await supabase.from("role_ncs_mappings").insert(mappingRows);
      if (error) return removeVersion(`v1.${nextMinor} NCS 매핑을 저장하지 못했습니다: ${error.message}`);
    }
    const { error: validationError } = await supabase.from("jd_validation_runs").insert({
      jd_version_id: newVersion.id,
      status: validation.status,
      coverage_score: validation.coverageScore,
      summary: validation.summary,
      findings: validation.findings as unknown as Json,
      model: GEMINI_MODEL,
    });
    if (validationError) return removeVersion(`v1.${nextMinor} 검토 결과를 저장하지 못했습니다: ${validationError.message}`);

    const updatedCharter: Json = {
      ...teamCharter,
      companyProfileId: latestVersion.organization_profile_id,
      inputRole: teamRole,
      mission: design.teamMission,
      outputs: design.teamOutputs,
      responsibilities: design.teamResponsibilities,
      stakeholders: design.stakeholders,
      suggestedRoles: design.suggestedRoles,
      ncsSearchPlan: plan,
      generator: GEMINI_MODEL,
      refinedAt: new Date().toISOString(),
    };
    await supabase.from("teams").update({ mission: design.teamMission, charter: updatedCharter, updated_at: new Date().toISOString() }).eq("id", role.team_id);
    await supabase.from("team_roles").update({
      title: design.primaryRole.title,
      intake: {
        ...intake,
        outputs: design.primaryRole.outputs,
        tools: design.primaryRole.tools,
        stakeholders: design.primaryRole.stakeholders,
        ncsSearchPlan: plan,
        refinedAt: new Date().toISOString(),
      } as Json,
      updated_at: new Date().toISOString(),
    }).eq("id", roleId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return { error: `v1.1 NCS 재검토 중 문제가 발생했습니다: ${message.slice(0, 400)}` };
  }

  redirect(`/jobs/${roleId}`);
}
