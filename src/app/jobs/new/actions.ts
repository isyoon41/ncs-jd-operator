"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import {
  GEMINI_MODEL,
  analyzeCompanyContext,
  generateGroundedDesign,
  planNcsSearch,
  retrieveNcsCandidates,
  validateGroundedDesign,
  type CompanyContext,
  type GroundedItem,
} from "@/lib/jd/company-designer";

export type CreateJdState = { error: string | null };

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const allowedMimeTypes = new Set(["application/pdf", "text/plain", "text/markdown"]);

const text = (formData: FormData, key: string, max: number) =>
  String(formData.get(key) ?? "").trim().slice(0, max);

const isUpload = (value: FormDataEntryValue | null): value is File =>
  value instanceof File && value.size > 0;

const safeFileName = (name: string) =>
  name.normalize("NFKC").replace(/[^가-힣a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-120) || "company-source";

export async function createJdDraft(
  _previousState: CreateJdState,
  formData: FormData,
): Promise<CreateJdState> {
  const organizationId = text(formData, "organizationId", 64);
  const companyIntroduction = text(formData, "companyIntroduction", 30_000);
  const teamName = text(formData, "teamName", 100);
  const teamRole = text(formData, "teamRole", 3000);
  const roleTitleHint = text(formData, "roleTitleHint", 100) || null;
  const uploadValue = formData.get("companyFile");
  const companyFile = isUpload(uploadValue) ? uploadValue : null;

  if (!organizationId || !teamName || !teamRole) {
    return { error: "회사, 팀명, 팀의 역할을 입력해 주세요." };
  }
  if (companyFile && (!allowedMimeTypes.has(companyFile.type) || companyFile.size > MAX_FILE_SIZE)) {
    return { error: "회사 자료는 8MB 이하의 PDF, TXT 또는 MD 파일만 업로드할 수 있습니다." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/jobs/new");

  const { data: isSuperAdmin } = await supabase.rpc("is_platform_admin");
  if (!isSuperAdmin) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return { error: "선택한 회사에 대한 접근 권한이 없습니다." };
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .maybeSingle();
  if (!organization) return { error: "회사를 찾을 수 없습니다." };

  const { data: latestProfiles } = await supabase
    .from("organization_profiles")
    .select("id, version_no, summary, structured_context")
    .eq("organization_id", organizationId)
    .order("version_no", { ascending: false })
    .limit(1);
  const latestProfile = latestProfiles?.[0] ?? null;
  const hasNewCompanySource = Boolean(companyIntroduction || companyFile);
  if (!hasNewCompanySource && !latestProfile) {
    return { error: "처음 설계하는 회사입니다. 회사 소개를 입력하거나 IR·회사소개 자료를 업로드해 주세요." };
  }

  let createdRoleId: string | null = null;
  try {
    let companyContext: CompanyContext;
    let profileId = latestProfile?.id ?? null;

    if (hasNewCompanySource) {
      const sourceIds: string[] = [];
      if (companyIntroduction) {
        const { data: source, error } = await supabase
          .from("organization_sources")
          .insert({
            organization_id: organizationId,
            source_type: "manual",
            title: `${organization.name} 직접 입력`,
            raw_text: companyIntroduction,
            mime_type: "text/plain",
            file_size: new Blob([companyIntroduction]).size,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (error) return { error: `회사 소개를 저장하지 못했습니다: ${error.message}` };
        sourceIds.push(source.id);
      }
      if (companyFile) {
        const storagePath = `${organizationId}/${crypto.randomUUID()}-${safeFileName(companyFile.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("company-sources")
          .upload(storagePath, companyFile, { contentType: companyFile.type, upsert: false });
        if (uploadError) return { error: `회사 자료를 업로드하지 못했습니다: ${uploadError.message}` };
        const { data: source, error } = await supabase
          .from("organization_sources")
          .insert({
            organization_id: organizationId,
            source_type: companyFile.type === "application/pdf" ? "pdf" : "text_file",
            title: companyFile.name,
            storage_path: storagePath,
            mime_type: companyFile.type,
            file_size: companyFile.size,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (error) return { error: `업로드 자료의 메타데이터를 저장하지 못했습니다: ${error.message}` };
        sourceIds.push(source.id);
      }

      companyContext = await analyzeCompanyContext({
        organizationName: organization.name,
        introduction: companyIntroduction,
        file: companyFile,
      });
      const { data: profile, error: profileError } = await supabase
        .from("organization_profiles")
        .insert({
          organization_id: organizationId,
          version_no: (latestProfile?.version_no ?? 0) + 1,
          summary: companyContext.summary,
          structured_context: companyContext as unknown as Json,
          source_ids: sourceIds,
          model: GEMINI_MODEL,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (profileError) return { error: `회사 프로필을 저장하지 못했습니다: ${profileError.message}` };
      profileId = profile.id;
    } else {
      companyContext = latestProfile!.structured_context as unknown as CompanyContext;
    }

    const ncsPlan = await planNcsSearch({ company: companyContext, teamName, teamRole, roleTitleHint });
    const candidates = await retrieveNcsCandidates(supabase, ncsPlan);
    const generatedDesign = await generateGroundedDesign({
      organizationName: organization.name,
      company: companyContext,
      teamName,
      teamRole,
      roleTitleHint,
      candidates,
    });
    const validation = await validateGroundedDesign({
      organizationName: organization.name,
      company: companyContext,
      teamName,
      teamRole,
      roleTitleHint,
      candidates,
      design: generatedDesign,
      revisionLabel: "v1.0",
    });
    const design = validation.design;

    const teamCharter: Json = {
      companyProfileId: profileId,
      inputRole: teamRole,
      mission: design.teamMission,
      outputs: design.teamOutputs,
      responsibilities: design.teamResponsibilities,
      stakeholders: design.stakeholders,
      suggestedRoles: design.suggestedRoles,
      ncsSearchPlan: ncsPlan,
      generator: GEMINI_MODEL,
      generatedAt: new Date().toISOString(),
    };
    const { data: existingTeam } = await supabase
      .from("teams")
      .select("id")
      .eq("organization_id", organizationId)
      .ilike("name", teamName)
      .limit(1)
      .maybeSingle();
    let teamId = existingTeam?.id ?? null;
    if (teamId) {
      const { error } = await supabase
        .from("teams")
        .update({ mission: design.teamMission, charter: teamCharter, updated_at: new Date().toISOString() })
        .eq("id", teamId);
      if (error) return { error: `팀 설계를 저장하지 못했습니다: ${error.message}` };
    } else {
      const { data: team, error } = await supabase
        .from("teams")
        .insert({ organization_id: organizationId, name: teamName, mission: design.teamMission, charter: teamCharter })
        .select("id")
        .single();
      if (error) return { error: `팀을 만들지 못했습니다: ${error.message}` };
      teamId = team.id;
    }

    const roleIntake: Json = {
      companyProfileId: profileId,
      teamRole,
      roleTitleHint,
      outputs: design.primaryRole.outputs,
      tools: design.primaryRole.tools,
      stakeholders: design.primaryRole.stakeholders,
      ncsSearchPlan: ncsPlan,
      generator: GEMINI_MODEL,
      generatedAt: new Date().toISOString(),
    };
    const { data: role, error: roleError } = await supabase
      .from("team_roles")
      .insert({ team_id: teamId!, title: design.primaryRole.title, intake: roleIntake, status: "draft" })
      .select("id")
      .single();
    if (roleError) return { error: `직무를 저장하지 못했습니다: ${roleError.message}` };

    const failRole = async (message: string) => {
      await supabase.from("team_roles").delete().eq("id", role.id);
      return { error: message };
    };
    const { data: version, error: versionError } = await supabase
      .from("jd_versions")
      .insert({
        team_role_id: role.id,
        version_no: 1,
        version_major: 1,
        version_minor: 0,
        revision_kind: "system_baseline",
        organization_profile_id: profileId,
        design_snapshot: design as unknown as Json,
        status: "draft",
        source: design.ncsMappings.length > 0 ? "ncs" : "user_input",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (versionError) return failRole(`JD v1.0을 만들지 못했습니다: ${versionError.message}`);

    const commonMetadata = { generated: true, generator: GEMINI_MODEL, semanticVersion: "1.0" };
    const sectionRows = [
      { kind: "mission" as const, content: design.primaryRole.mission, position: 0, metadata: commonMetadata },
      ...design.primaryRole.responsibilities.map((item, index) => ({ kind: "responsibility" as const, content: item.content, position: 100 + index, metadata: { ...commonMetadata, basis: item.basis, ncsCodes: item.ncsCodes } })),
      ...design.primaryRole.requiredQualifications.map((item, index) => ({ kind: "qualification_required" as const, content: item.content, position: 200 + index, metadata: { ...commonMetadata, basis: item.basis, ncsCodes: item.ncsCodes } })),
      ...design.primaryRole.preferredQualifications.map((item, index) => ({ kind: "qualification_preferred" as const, content: item.content, position: 300 + index, metadata: { ...commonMetadata, basis: item.basis, ncsCodes: item.ncsCodes } })),
      ...design.primaryRole.kpis.map((item, index) => ({ kind: "kpi" as const, content: item.name, position: 400 + index, metadata: { ...commonMetadata, measure: item.measure, cadence: item.cadence, targetGuide: item.targetGuide, rationale: item.rationale } })),
    ].map((section) => ({ ...section, jd_version_id: version.id, metadata: section.metadata as Json }));
    const { data: savedSections, error: sectionError } = await supabase
      .from("jd_sections")
      .insert(sectionRows)
      .select("id, kind, position, content");
    if (sectionError) return failRole(`JD 섹션을 저장하지 못했습니다: ${sectionError.message}`);

    const codeToCandidate = new Map(candidates.map((item) => [item.ncsCode, item]));
    const groundedGroups: Array<{ kind: "responsibility" | "qualification_required" | "qualification_preferred"; items: GroundedItem[] }> = [
      { kind: "responsibility", items: design.primaryRole.responsibilities },
      { kind: "qualification_required", items: design.primaryRole.requiredQualifications },
      { kind: "qualification_preferred", items: design.primaryRole.preferredQualifications },
    ];
    const evidenceRows = groundedGroups.flatMap(({ kind, items }) => {
      const sections = savedSections.filter((section) => section.kind === kind).sort((a, b) => a.position - b.position);
      return items.flatMap((item, index) => {
        const section = sections[index];
        if (!section) return [];
        const ncsRows = item.ncsCodes.flatMap((code) => {
          const candidate = codeToCandidate.get(code);
          return candidate ? [{
            jd_section_id: section.id,
            source: "ncs" as const,
            ncs_competency_unit_id: candidate.id,
            snippet: design.ncsMappings.find((mapping) => mapping.ncsCode === code)?.rationale ?? `${candidate.name}과 연결`,
            confidence: design.ncsMappings.find((mapping) => mapping.ncsCode === code)?.matchStrength === "high" ? 0.9 : 0.7,
          }] : [];
        });
        return [...ncsRows, {
          jd_section_id: section.id,
          source: "user_input" as const,
          ncs_competency_unit_id: null,
          snippet: item.basis === "company" ? "회사 소개·IR 자료에서 도출" : item.basis === "team_input" ? "사용자가 입력한 팀 역할에서 도출" : "회사·팀 맥락을 바탕으로 AI가 보완",
          confidence: null,
        }];
      });
    });
    const missionSection = savedSections.find((section) => section.kind === "mission");
    if (missionSection) evidenceRows.push({
      jd_section_id: missionSection.id,
      source: "user_input",
      ncs_competency_unit_id: null,
      snippet: "회사 프로필과 사용자가 입력한 팀 역할을 근거로 생성",
      confidence: null,
    });
    if (evidenceRows.length > 0) {
      const { error } = await supabase.from("jd_evidence").insert(evidenceRows);
      if (error) return failRole(`문장별 근거를 저장하지 못했습니다: ${error.message}`);
    }

    const mappingRows = design.ncsMappings.flatMap((mapping) => {
      const candidate = codeToCandidate.get(mapping.ncsCode);
      return candidate ? [{
        team_role_id: role.id,
        jd_version_id: version.id,
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
      if (error) return failRole(`NCS 매핑을 저장하지 못했습니다: ${error.message}`);
    }
    const { error: validationError } = await supabase.from("jd_validation_runs").insert({
      jd_version_id: version.id,
      status: validation.status,
      coverage_score: validation.coverageScore,
      summary: validation.summary,
      findings: validation.findings as unknown as Json,
      model: GEMINI_MODEL,
    });
    if (validationError) return failRole(`NCS 검토 결과를 저장하지 못했습니다: ${validationError.message}`);

    createdRoleId = role.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return { error: `직무설계 중 문제가 발생했습니다: ${message.slice(0, 400)}` };
  }
  redirect(`/jobs/${createdRoleId}`);
}
