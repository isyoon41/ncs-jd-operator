import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type NcsRecommendation = {
  id: string;
  ncs_code: string;
  name: string;
  level: string | null;
  score: number;
};

const stopwords = new Set([
  "관련", "업무", "관리", "운영", "통한", "위한", "대한", "수행", "기반", "그리고",
  "합니다", "있습니다", "있는", "하는", "에서", "으로", "한다", "해야", "우리", "회사",
]);

function keywords(text: string) {
  return [...new Set(
    text
      .toLowerCase()
      .match(/[가-힣a-z0-9]+/g)
      ?.filter((word) => word.length >= 2 && !stopwords.has(word)) ?? [],
  )].sort((a, b) => b.length - a.length).slice(0, 10);
}

export async function recommendNcsUnits(
  supabase: SupabaseClient<Database>,
  title: string,
  coreTasks: string[],
): Promise<NcsRecommendation[]> {
  const terms = keywords(`${title} ${coreTasks.join(" ")}`);
  if (terms.length === 0) return [];

  const responses = await Promise.all(
    terms.map((term) =>
      supabase
        .from("ncs_competency_units")
        .select("id, ncs_code, name, level")
        .ilike("name", `%${term}%`)
        .limit(8),
    ),
  );
  const candidates = new Map<string, Omit<NcsRecommendation, "score">>();
  responses.forEach(({ data }) => data?.forEach((unit) => candidates.set(unit.id, unit)));

  return [...candidates.values()]
    .map((unit) => {
      const normalizedName = unit.name.toLowerCase();
      const score = terms.reduce((total, term, index) =>
        total + (normalizedName.includes(term) ? Math.max(2, 12 - index) : 0), 0,
      );
      return { ...unit, score };
    })
    .filter((unit) => unit.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ko"))
    .slice(0, 5);
}

const sentence = (value: string) => {
  const trimmed = value.trim();
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}한다.`;
};

type DraftInput = {
  teamName: string;
  title: string;
  hiringReason: string;
  coreTasks: string[];
  seniority: string | null;
  ncsUnits: NcsRecommendation[];
};

export type GeneratedDraft = {
  mission: string;
  responsibilities: string[];
  requiredQualifications: string[];
  preferredQualifications: string[];
  kpis: string[];
  ncsRationales: Record<string, string>;
  generator: "gemini-3.6-flash" | "ncs-rule-v1";
};

function generateRuleDraft(input: DraftInput): GeneratedDraft {
  const reason = input.hiringReason.replace(/[.!?]+$/, "");
  const mission = `${input.teamName}에서 ${reason}를 위해 ${input.title}의 전문성을 발휘하고, 핵심 업무의 일관된 실행과 성과 창출을 이끕니다.`;
  const responsibilities = input.coreTasks.map(sentence);
  const requiredQualifications = [
    input.seniority
      ? `${input.seniority} 수준의 관련 실무 경험 또는 이에 준하는 역량`
      : "담당 업무를 독립적으로 수행하고 결과를 설명할 수 있는 실무 역량",
    ...input.ncsUnits.slice(0, 3).map((unit) => `${unit.name} 능력단위에 준하는 지식·기술·태도`),
  ];
  const preferredQualifications = [
    "관련 부서와 협업하여 업무 기준과 우선순위를 조율한 경험",
    ...(input.ncsUnits[0]
      ? [`${input.ncsUnits[0].name} 관련 교육·자격 또는 프로젝트 경험`]
      : ["업무 표준을 정리하고 지속적으로 개선한 경험"]),
  ];
  const kpis = input.coreTasks.slice(0, 5).map((task) => {
    const conciseTask = task.length > 42 ? `${task.slice(0, 42)}…` : task;
    return `“${conciseTask}” 업무의 일정·품질 목표 달성도`;
  });

  return {
    mission,
    responsibilities,
    requiredQualifications,
    preferredQualifications,
    kpis,
    ncsRationales: Object.fromEntries(
      input.ncsUnits.map((unit) => [unit.ncs_code, `${input.title}의 핵심 업무 표현과 ${unit.name} 능력단위명이 일치합니다.`]),
    ),
    generator: "ncs-rule-v1",
  };
}

const draftSchema = {
  type: "OBJECT",
  properties: {
    mission: { type: "STRING", description: "직무가 조직에 기여하는 목적을 한 문단으로 작성" },
    responsibilities: { type: "ARRAY", minItems: 3, maxItems: 8, items: { type: "STRING" } },
    requiredQualifications: { type: "ARRAY", minItems: 2, maxItems: 6, items: { type: "STRING" } },
    preferredQualifications: { type: "ARRAY", minItems: 1, maxItems: 5, items: { type: "STRING" } },
    kpis: { type: "ARRAY", minItems: 2, maxItems: 6, items: { type: "STRING" } },
    ncsRationales: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          ncsCode: { type: "STRING" },
          rationale: { type: "STRING" },
        },
        required: ["ncsCode", "rationale"],
      },
    },
  },
  required: ["mission", "responsibilities", "requiredQualifications", "preferredQualifications", "kpis", "ncsRationales"],
} as const;

function stringArray(value: unknown, fallback: string[], max: number) {
  if (!Array.isArray(value)) return fallback;
  const result = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, max);
  return result.length > 0 ? result : fallback;
}

export async function generateDraft(input: DraftInput): Promise<GeneratedDraft> {
  const fallback = generateRuleDraft(input);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback;

  const ncsContext = input.ncsUnits.length > 0
    ? input.ncsUnits.map((unit) => `- ${unit.ncs_code} | ${unit.name} | 수준 ${unit.level ?? "미상"}`).join("\n")
    : "- 자동 검색에서 직접 일치한 능력단위 없음. NCS 근거를 임의로 만들지 말 것.";
  const prompt = `당신은 한국 기업의 직무설계 전문가입니다. 아래 직무 브리프와 실제 검색된 NCS 능력단위를 근거로 채용용 JD 초안을 한국어로 작성하세요.

[조직 맥락]
팀: ${input.teamName}
직무명: ${input.title}
경력 수준: ${input.seniority ?? "미지정"}
채용 목적: ${input.hiringReason}

[현업 핵심 업무]
${input.coreTasks.map((task) => `- ${task}`).join("\n")}

[검색된 NCS 근거]
${ncsContext}

[작성 원칙]
- 사용자가 제공하지 않은 학력, 자격증, 연차를 임의로 필수 조건으로 만들지 마세요.
- 주요 책임은 행동과 결과가 드러나는 문장으로 정리하세요.
- KPI는 측정 가능한 결과 또는 품질·일정·전환 지표 후보로 작성하세요.
- NCS는 위 목록에 있는 코드만 사용하고, 각 코드가 어떤 업무와 연결되는지 ncsRationales에 설명하세요.
- NCS 문구를 그대로 복사하지 말고 회사의 실제 업무 맥락으로 해석하세요.
- 결과는 제공된 JSON 스키마만 따르세요.`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: draftSchema,
            maxOutputTokens: 4096,
          },
        }),
        signal: AbortSignal.timeout(45_000),
      },
    );
    if (!response.ok) return fallback;
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    if (!text) return fallback;
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const rationaleItems = Array.isArray(parsed.ncsRationales) ? parsed.ncsRationales : [];
    const ncsRationales = Object.fromEntries(
      rationaleItems.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const ncsCode = "ncsCode" in item && typeof item.ncsCode === "string" ? item.ncsCode : null;
        const rationale = "rationale" in item && typeof item.rationale === "string" ? item.rationale : null;
        return ncsCode && rationale ? [[ncsCode, rationale]] : [];
      }),
    );

    return {
      mission: typeof parsed.mission === "string" && parsed.mission.trim() ? parsed.mission.trim() : fallback.mission,
      responsibilities: stringArray(parsed.responsibilities, fallback.responsibilities, 8),
      requiredQualifications: stringArray(parsed.requiredQualifications, fallback.requiredQualifications, 6),
      preferredQualifications: stringArray(parsed.preferredQualifications, fallback.preferredQualifications, 5),
      kpis: stringArray(parsed.kpis, fallback.kpis, 6),
      ncsRationales: { ...fallback.ncsRationales, ...ncsRationales },
      generator: "gemini-3.6-flash",
    };
  } catch {
    return fallback;
  }
}
