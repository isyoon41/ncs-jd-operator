"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type CreateJdState = { error: string | null };

const requiredText = (formData: FormData, key: string, max = 2000) => {
  const value = String(formData.get(key) ?? "").trim();
  return value && value.length <= max ? value : null;
};

const lines = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 30);

export async function createJdDraft(
  _previousState: CreateJdState,
  formData: FormData,
): Promise<CreateJdState> {
  const organizationId = requiredText(formData, "organizationId", 64);
  const selectedTeamId = requiredText(formData, "teamId", 64);
  const newTeamName = requiredText(formData, "newTeamName", 100);
  const title = requiredText(formData, "title", 100);
  const seniority = String(formData.get("seniority") ?? "").trim().slice(0, 80) || null;
  const mission = requiredText(formData, "mission", 2000);
  const responsibilities = lines(formData, "responsibilities");
  const requiredQualifications = lines(formData, "requiredQualifications");
  const preferredQualifications = lines(formData, "preferredQualifications");
  const kpis = lines(formData, "kpis");
  const tools = lines(formData, "tools");
  const ncsIds = [...new Set(formData.getAll("ncsIds").map(String))].slice(0, 20);

  if (!organizationId || !title || !mission || responsibilities.length === 0) {
    return { error: "회사, 직무명, 직무 미션, 주요 책임을 모두 입력해 주세요." };
  }
  if (!selectedTeamId && !newTeamName) {
    return { error: "기존 팀을 선택하거나 새 팀 이름을 입력해 주세요." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/jobs/new");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { error: "선택한 회사에 대한 접근 권한이 없습니다." };

  let teamId = selectedTeamId;
  let createdTeamId: string | null = null;

  if (teamId) {
    const { data: team } = await supabase
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!team) return { error: "선택한 팀을 찾을 수 없습니다." };
  } else {
    const { data: team, error } = await supabase
      .from("teams")
      .insert({ organization_id: organizationId, name: newTeamName!, mission })
      .select("id")
      .single();
    if (error) return { error: `팀을 만들지 못했습니다: ${error.message}` };
    teamId = team.id;
    createdTeamId = team.id;
  }

  const intake: Json = { mission, responsibilities, requiredQualifications, preferredQualifications, kpis, tools, ncsIds };
  const { data: role, error: roleError } = await supabase
    .from("team_roles")
    .insert({ team_id: teamId!, title, seniority_hint: seniority, intake, status: "draft" })
    .select("id")
    .single();

  if (roleError) {
    if (createdTeamId) await supabase.from("teams").delete().eq("id", createdTeamId);
    return { error: `직무를 저장하지 못했습니다: ${roleError.message}` };
  }

  const fail = async (message: string) => {
    await supabase.from("team_roles").delete().eq("id", role.id);
    if (createdTeamId) await supabase.from("teams").delete().eq("id", createdTeamId);
    return { error: message };
  };

  const { data: version, error: versionError } = await supabase
    .from("jd_versions")
    .insert({ team_role_id: role.id, version_no: 1, status: "draft", source: "user_input", created_by: user.id })
    .select("id")
    .single();
  if (versionError) return fail(`JD 버전을 만들지 못했습니다: ${versionError.message}`);

  const sectionRows = [
    { kind: "mission" as const, content: mission, position: 0 },
    ...responsibilities.map((content, index) => ({ kind: "responsibility" as const, content, position: 100 + index })),
    ...requiredQualifications.map((content, index) => ({ kind: "qualification_required" as const, content, position: 200 + index })),
    ...preferredQualifications.map((content, index) => ({ kind: "qualification_preferred" as const, content, position: 300 + index })),
    ...kpis.map((content, index) => ({ kind: "kpi" as const, content, position: 400 + index })),
  ].map((section) => ({ ...section, jd_version_id: version.id }));

  const { data: savedSections, error: sectionError } = await supabase
    .from("jd_sections")
    .insert(sectionRows)
    .select("id, kind, content");
  if (sectionError) return fail(`JD 섹션을 저장하지 못했습니다: ${sectionError.message}`);

  const responsibilitySections = savedSections.filter((section) => section.kind === "responsibility");
  if (ncsIds.length > 0 && responsibilitySections.length > 0) {
    const evidenceRows = responsibilitySections.flatMap((section) =>
      ncsIds.map((ncsId) => ({ jd_section_id: section.id, source: "ncs" as const, ncs_competency_unit_id: ncsId, snippet: section.content })),
    );
    const { error: evidenceError } = await supabase.from("jd_evidence").insert(evidenceRows);
    if (evidenceError) return fail(`NCS 근거를 저장하지 못했습니다: ${evidenceError.message}`);
  }

  redirect(`/jobs/${role.id}`);
}
