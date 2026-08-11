import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { stringArray, textValue } from "./company-context";
import { computeCoverageScore } from "./coverage-score";

export const GEMINI_MODEL = "gemini-3.6-flash";

export type CompanyContext = {
  summary: string;
  mission: string;
  vision: string;
  coreValues: string[];
  mvcBasis: "stated" | "inferred";
  businessAreas: string[];
  productsServices: string[];
  customers: string[];
  businessModel: string;
  growthStage: string;
  strategicPriorities: string[];
  culture: string[];
  keyTerms: string[];
  uncertainties: string[];
};

export type NcsSearchPlan = {
  majorCodes: string[];
  searchTerms: string[];
  rationale: string;
};

export type NcsCandidate = {
  id: string;
  ncsCode: string;
  name: string;
  level: string | null;
  definition: string | null;
  lclasName: string | null;
  mclasName: string | null;
  sclasName: string | null;
  subdName: string | null;
};

export type GroundedItem = {
  content: string;
  ncsCodes: string[];
  basis: "company" | "team_input" | "ncs" | "ai_inference";
};

export type ReasoningNotes = {
  contextUnderstanding: string;
  competencySelection: string;
  responsibilityDesign: string;
  evidenceClassification: string;
  qualificationAndKpi: string;
};

export type TeamDesign = {
  reasoningNotes: ReasoningNotes;
  teamMission: string;
  teamOutputs: string[];
  teamResponsibilities: string[];
  stakeholders: string[];
  suggestedRoles: Array<{ title: string; purpose: string }>;
  primaryRole: {
    title: string;
    mission: string;
    outputs: string[];
    responsibilities: GroundedItem[];
    requiredQualifications: GroundedItem[];
    preferredQualifications: GroundedItem[];
    tools: string[];
    stakeholders: string[];
    kpis: Array<{
      name: string;
      measure: string;
      cadence: string;
      targetGuide: string;
      rationale: string;
    }>;
  };
  ncsMappings: Array<{
    ncsCode: string;
    rationale: string;
    matchStrength: "high" | "medium" | "low";
    matchedInputs: string[];
  }>;
};

export type ValidationResult = {
  status: "passed" | "passed_with_notes" | "needs_review";
  coverageScore: number;
  summary: string;
  findings: Array<{
    severity: "info" | "warning" | "critical";
    category: string;
    message: string;
  }>;
  design: TeamDesign;
};

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

async function generateStructured<T>(parts: GeminiPart[], schema: object, operation: string): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          maxOutputTokens: 8192,
        },
      }),
      signal: AbortSignal.timeout(90_000),
    },
  );
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`${operation} Gemini 요청 실패(${response.status}): ${payload.slice(0, 240)}`);
  }
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!text) throw new Error("Gemini가 구조화된 결과를 반환하지 않았습니다.");
  return JSON.parse(text) as T;
}

const companySchema = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    mission: { type: "STRING" },
    vision: { type: "STRING" },
    coreValues: { type: "ARRAY", items: { type: "STRING" }, maxItems: 6 },
    mvcBasis: { type: "STRING", enum: ["stated", "inferred"] },
    businessAreas: { type: "ARRAY", items: { type: "STRING" }, maxItems: 8 },
    productsServices: { type: "ARRAY", items: { type: "STRING" }, maxItems: 10 },
    customers: { type: "ARRAY", items: { type: "STRING" }, maxItems: 8 },
    businessModel: { type: "STRING" },
    growthStage: { type: "STRING" },
    strategicPriorities: { type: "ARRAY", items: { type: "STRING" }, maxItems: 8 },
    culture: { type: "ARRAY", items: { type: "STRING" }, maxItems: 8 },
    keyTerms: { type: "ARRAY", items: { type: "STRING" }, maxItems: 16 },
    uncertainties: { type: "ARRAY", items: { type: "STRING" }, maxItems: 8 },
  },
  required: ["summary", "mission", "vision", "coreValues", "mvcBasis", "businessAreas", "productsServices", "customers", "businessModel", "growthStage", "strategicPriorities", "culture", "keyTerms", "uncertainties"],
} as const;

export async function analyzeCompanyContext(input: {
  organizationName: string;
  introduction: string;
  file: File | null;
}): Promise<CompanyContext> {
  const prompt = `당신은 스타트업 조직설계 컨설턴트입니다. 제공된 회사 소개 또는 IR 자료에서 확인 가능한 사실만 추출하여 회사 프로필을 만드세요.

[회사명]
${input.organizationName}

[사용자 직접 입력]
${input.introduction || "없음"}

[원칙]
- 자료에 없는 사실은 만들지 말고 uncertainties에 기록하세요.
- 채용 홍보 문구가 아니라 팀과 직무를 설계하는 데 필요한 사업 맥락을 정리하세요.
- 고유명사, 제품명, 고객군, 규제·기술 용어는 keyTerms에 보존하세요.
- 결과는 지정된 JSON 스키마만 따르세요.

[미션·비전·핵심가치(MVC) 처리]
- 자료에 미션·비전·핵심가치가 명시되어 있으면 그대로 정리하고 mvcBasis를 "stated"로 표시하세요.
- 명시되어 있지 않다면(대부분의 스타트업이 이 경우입니다), 사업모델·제품/서비스·고객·전략 우선순위 등 자료에서 확인된 사실을 근거로 이 회사가 실제로 추구하는 목적과 가치를 논리적으로 정리하세요. 자료에 없는 새로운 사실(수치, 연혁, 수상 이력 등)을 지어내는 것과는 다릅니다 — 이미 확인된 사실을 압축·재구성하는 것입니다. 이 경우 mvcBasis를 "inferred"로 표시하세요.
- coreValues는 짧은 명사구 2~5개로 씁니다.`;
  const parts: GeminiPart[] = [{ text: prompt }];
  if (input.file) {
    if (input.file.type === "application/pdf") {
      const data = Buffer.from(await input.file.arrayBuffer()).toString("base64");
      parts.push({ inlineData: { mimeType: "application/pdf", data } });
    } else {
      const fileText = (await input.file.text()).slice(0, 120_000);
      parts.push({ text: `[업로드 파일: ${input.file.name}]\n${fileText}` });
    }
  }
  const raw = await generateStructured<Record<string, unknown>>(parts, companySchema, "회사 프로필 분석");
  const mvcBasisValue = textValue(raw.mvcBasis);
  return {
    summary: textValue(raw.summary, input.introduction || `${input.organizationName} 회사 프로필`),
    mission: textValue(raw.mission, "자료에서 확인되지 않음"),
    vision: textValue(raw.vision, "자료에서 확인되지 않음"),
    coreValues: stringArray(raw.coreValues, 6),
    mvcBasis: mvcBasisValue === "stated" ? "stated" : "inferred",
    businessAreas: stringArray(raw.businessAreas, 8),
    productsServices: stringArray(raw.productsServices, 10),
    customers: stringArray(raw.customers, 8),
    businessModel: textValue(raw.businessModel, "자료에서 확인되지 않음"),
    growthStage: textValue(raw.growthStage, "자료에서 확인되지 않음"),
    strategicPriorities: stringArray(raw.strategicPriorities, 8),
    culture: stringArray(raw.culture, 8),
    keyTerms: stringArray(raw.keyTerms, 16),
    uncertainties: stringArray(raw.uncertainties, 8),
  };
}

const ncsPlanSchema = {
  type: "OBJECT",
  properties: {
    majorCodes: { type: "ARRAY", items: { type: "STRING" }, maxItems: 4 },
    searchTerms: { type: "ARRAY", items: { type: "STRING" }, maxItems: 14 },
    rationale: { type: "STRING" },
  },
  required: ["majorCodes", "searchTerms", "rationale"],
} as const;

const ncsMajorClasses = `01 사업관리, 02 경영·회계·사무, 03 금융·보험, 04 교육·자연·사회과학, 05 법률·경찰·소방·교도·국방, 06 보건·의료, 07 사회복지·종교, 08 문화·예술·디자인·방송, 09 운전·운송, 10 영업판매, 11 경비·청소, 12 이용·숙박·여행·오락·스포츠, 13 음식서비스, 14 건설, 15 기계, 16 재료, 17 화학·바이오, 18 섬유·의복, 19 전기·전자, 20 정보통신, 21 식품가공, 22 인쇄·목재·가구·공예, 23 환경·에너지·안전, 24 농림어업`;

export async function planNcsSearch(input: {
  company: CompanyContext;
  teamName: string;
  teamRole: string;
  roleTitleHint: string | null;
  additionalContext?: string;
}): Promise<NcsSearchPlan> {
  const prompt = `회사와 팀 맥락을 근거로 한국 NCS 능력단위를 내부 검색하기 위한 계획을 만드세요.

[NCS 대분류]
${ncsMajorClasses}

[회사 프로필]
${JSON.stringify(input.company)}

[팀]
팀명: ${input.teamName}
팀 역할: ${input.teamRole}
직무명 힌트: ${input.roleTitleHint ?? "없음"}
추가 맥락: ${input.additionalContext ?? "없음"}

[원칙]
- majorCodes에는 실제 관련성이 높은 대분류 코드만 넣으세요.
- searchTerms는 '관리', '운영', '분석'처럼 너무 일반적인 단어보다 NCS 능력단위명에 등장할 구체적인 직무·과업 표현을 사용하세요.
- 회사 산업과 무관한 분야를 넓게 포함하지 마세요.`;
  const raw = await generateStructured<Record<string, unknown>>([{ text: prompt }], ncsPlanSchema, "NCS 검색계획 생성");
  return {
    majorCodes: stringArray(raw.majorCodes, 4).filter((code) => /^\d{2}$/.test(code)),
    searchTerms: stringArray(raw.searchTerms, 14),
    rationale: textValue(raw.rationale),
  };
}

export async function retrieveNcsCandidates(
  supabase: SupabaseClient<Database>,
  plan: NcsSearchPlan,
): Promise<NcsCandidate[]> {
  const responses = await Promise.all(
    plan.searchTerms.map((term) =>
      supabase
        .from("ncs_competency_units")
        .select("id, ncs_code, name, level, definition, lclas_name, mclas_name, sclas_name, subd_name")
        .ilike("name", `%${term}%`)
        .limit(20),
    ),
  );
  const unique = new Map<string, NcsCandidate>();
  responses.forEach(({ data }) => data?.forEach((unit) => unique.set(unit.id, {
    id: unit.id,
    ncsCode: unit.ncs_code,
    name: unit.name,
    level: unit.level,
    definition: unit.definition,
    lclasName: unit.lclas_name,
    mclasName: unit.mclas_name,
    sclasName: unit.sclas_name,
    subdName: unit.subd_name,
  })));
  const candidates = [...unique.values()];
  const scoped = plan.majorCodes.length > 0
    ? candidates.filter((unit) => plan.majorCodes.some((code) => unit.ncsCode.startsWith(code)))
    : candidates;
  return (scoped.length >= 5 ? scoped : candidates).slice(0, 50);
}

const encodedPayloadSchema = {
  type: "OBJECT",
  properties: {
    payload: { type: "STRING" },
  },
  required: ["payload"],
} as const;

function parseEncodedPayload(raw: Record<string, unknown>, operation: string): Record<string, unknown> {
  const payload = textValue(raw.payload);
  if (!payload) throw new Error(`${operation} 결과에 payload가 없습니다.`);
  try {
    const parsed = JSON.parse(payload) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // The error below gives the user an operation-specific message.
  }
  throw new Error(`${operation} 결과의 내부 JSON을 해석하지 못했습니다.`);
}

function normalizeGroundedItems(value: unknown, allowedCodes: Set<string>, fallback: GroundedItem[]): GroundedItem[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.flatMap((item): GroundedItem[] => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const content = textValue(record.content);
    if (!content) return [];
    const basisValue = textValue(record.basis);
    const basis: GroundedItem["basis"] = ["company", "team_input", "ncs", "ai_inference"].includes(basisValue)
      ? basisValue as GroundedItem["basis"]
      : "ai_inference";
    return [{ content, ncsCodes: stringArray(record.ncsCodes, 3).filter((code) => allowedCodes.has(code)), basis }];
  });
  return items.length > 0 ? items : fallback;
}

function normalizeReasoningNotes(value: unknown): ReasoningNotes {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    contextUnderstanding: textValue(record.contextUnderstanding),
    competencySelection: textValue(record.competencySelection),
    responsibilityDesign: textValue(record.responsibilityDesign),
    evidenceClassification: textValue(record.evidenceClassification),
    qualificationAndKpi: textValue(record.qualificationAndKpi),
  };
}

function normalizeDesign(raw: Record<string, unknown>, input: {
  teamName: string;
  teamRole: string;
  roleTitleHint: string | null;
  candidates: NcsCandidate[];
}): TeamDesign {
  const allowedCodes = new Set(input.candidates.map((item) => item.ncsCode));
  const primary = raw.primaryRole && typeof raw.primaryRole === "object" ? raw.primaryRole as Record<string, unknown> : {};
  const fallbackResponsibility: GroundedItem = { content: input.teamRole, ncsCodes: [], basis: "team_input" };
  const mappings = Array.isArray(raw.ncsMappings) ? raw.ncsMappings.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const ncsCode = textValue(record.ncsCode);
    if (!allowedCodes.has(ncsCode)) return [];
    const strengthValue = textValue(record.matchStrength);
    const matchStrength: "high" | "medium" | "low" = ["high", "medium", "low"].includes(strengthValue)
      ? strengthValue as "high" | "medium" | "low"
      : "medium";
    return [{ ncsCode, rationale: textValue(record.rationale), matchStrength, matchedInputs: stringArray(record.matchedInputs, 6) }];
  }) : [];
  const roles = Array.isArray(raw.suggestedRoles) ? raw.suggestedRoles.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const title = textValue(record.title);
    return title ? [{ title, purpose: textValue(record.purpose) }] : [];
  }).slice(0, 8) : [];
  const kpis = Array.isArray(primary.kpis) ? primary.kpis.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const name = textValue(record.name);
    return name ? [{
      name,
      measure: textValue(record.measure),
      cadence: textValue(record.cadence),
      targetGuide: textValue(record.targetGuide),
      rationale: textValue(record.rationale),
    }] : [];
  }).slice(0, 8) : [];
  const title = textValue(primary.title, input.roleTitleHint ?? `${input.teamName} 담당자`);
  return {
    reasoningNotes: normalizeReasoningNotes(raw.reasoningNotes),
    teamMission: textValue(raw.teamMission, input.teamRole),
    teamOutputs: stringArray(raw.teamOutputs, 8),
    teamResponsibilities: stringArray(raw.teamResponsibilities, 10),
    stakeholders: stringArray(raw.stakeholders, 10),
    suggestedRoles: roles.length > 0 ? roles : [{ title, purpose: input.teamRole }],
    primaryRole: {
      title,
      mission: textValue(primary.mission, input.teamRole),
      outputs: stringArray(primary.outputs, 8),
      responsibilities: normalizeGroundedItems(primary.responsibilities, allowedCodes, [fallbackResponsibility]),
      requiredQualifications: normalizeGroundedItems(primary.requiredQualifications, allowedCodes, []),
      preferredQualifications: normalizeGroundedItems(primary.preferredQualifications, allowedCodes, []),
      tools: stringArray(primary.tools, 10),
      stakeholders: stringArray(primary.stakeholders, 10),
      kpis,
    },
    ncsMappings: mappings,
  };
}

export async function generateGroundedDesign(input: {
  organizationName: string;
  company: CompanyContext;
  teamName: string;
  teamRole: string;
  roleTitleHint: string | null;
  candidates: NcsCandidate[];
}): Promise<TeamDesign> {
  const prompt = `당신은 한국 스타트업의 조직·직무설계 전문가입니다. 회사와 팀의 최소 정보로 바로 사용할 수 있는 직무기술서 v1.0을 설계하세요.

[회사]
${input.organizationName}
${JSON.stringify(input.company)}

[팀 입력]
팀명: ${input.teamName}
팀 역할: ${input.teamRole}
직무명 힌트: ${input.roleTitleHint ?? "없음. 팀에 필요한 대표 직무명을 설계할 것"}

[검색된 NCS 후보]
${JSON.stringify(input.candidates.map((item) => ({ code: item.ncsCode, name: item.name, level: item.level, definition: item.definition, classification: [item.lclasName, item.mclasName, item.sclasName, item.subdName].filter(Boolean).join(" > ") })))}

[사고 순서]
아래 5단계 순서로 판단한 뒤 결과를 작성하세요. 각 단계의 판단 근거는 reasoningNotes에 남깁니다.
1. 직무 맥락 파악 — 회사의 미션·비전·핵심가치(mission/vision/coreValues)와 산업·사업모델을 함께 이해하고, 이 팀이 맡은 기능이 그 목적에 어떻게 기여하는지 파악합니다.
2. 능력단위 선별 — 검색된 NCS 후보 중 이 팀의 과업과 실제로 맞닿는 것만 채택하고, 산업이나 과업이 무관한 후보는 제외합니다.
3. 책임·산출물 설계 — 팀 역할을 핵심 산출물과 주요 책임으로 구체화합니다.
4. 근거 구분 — 문장마다 회사 자료, 팀 입력, NCS, AI 보완 중 무엇에서 나왔는지 정리합니다.
5. 자격요건·KPI 정리 — 확인되지 않은 조건은 배제하고, 측정 가능한 KPI로 구성합니다.

[문체 가이드]
- 미션 문장은 1~2문장, "~한다"체로 마칩니다. 명사형(~함, ~을 위함)으로 끝내지 않습니다.
- 책임 문장은 한 문장에 하나의 행동만 담고, 40자 내외로 "~한다"체로 씁니다.
- 자격요건은 "~능력", "~역량", "~경험"처럼 명사구로 통일하고 완결된 문장으로 쓰지 않습니다.
- "혁신적인", "최고의", "탁월한" 같은 근거 없는 수식어를 쓰지 않습니다. 구체적인 행동·대상·산출물로 표현합니다.

[설계 원칙]
- teamMission과 primaryRole.mission을 쓸 때, 회사 mission의 핵심 목적뿐 아니라 vision이 가리키는 방향성과 coreValues 중 이 팀이 실제로 구현하는 가치 최소 1개를 함께 반영하세요. 세 가지를 기계적으로 나열하지 말고 자연스러운 한 문장으로 녹이세요. mission만 살짝 바꿔 쓰고 vision·coreValues를 무시하는 것은 금지합니다.
- reasoningNotes.contextUnderstanding에는 이번 설계에 실제로 반영한 mission·vision·coreValues 내용을 구체적으로 인용하세요(예: "비전의 '기술혁신 산업 리더십' 방향과 핵심가치 '동반성장'을 팀 미션에 반영함"). "회사 미션에 맞춰 구체화했다"처럼 내용을 인용하지 않는 두루뭉술한 문장은 금지합니다.
- NCS는 회사 맥락을 보완하는 근거이며 회사 현실을 덮어쓰지 않습니다.
- ncsCodes와 ncsMappings에는 위 후보 목록에 실제 존재하는 코드만 사용합니다.
- 관련성이 낮거나 산업이 충돌하는 후보는 사용하지 않습니다. 적합한 후보가 없으면 빈 배열을 허용합니다.
- 회사 자료에 없는 학위, 경력연수, 자격증을 필수 조건으로 발명하지 않습니다.
- 각 책임은 행동, 대상, 산출물 또는 결과가 드러나는 문장으로 씁니다.
- KPI 목표값은 외부 수치를 복사하지 말고 회사가 기준선을 정할 수 있는 targetGuide로 작성합니다.
- suggestedRoles는 팀 기능을 수행하는 역할 포트폴리오이며 primaryRole은 이번에 생성할 대표 JD입니다.
- reasoningNotes의 각 문장은 실제 인사담당자·조직설계 컨설턴트가 검토의견을 남기듯 씁니다. "필터링", "매칭", "파싱", "스키마" 같은 개발 용어를 쓰지 말고 "선별", "연결", "검토", "구성" 같은 인사·조직설계 용어로 1~2문장씩 씁니다.
- 응답 객체의 payload에는 아래 계약을 만족하는 JSON 객체 하나를 문자열로 직렬화해 넣습니다. 마크다운 코드블록은 사용하지 않습니다.

[payload 내부 JSON 계약]
{
  "reasoningNotes": {
    "contextUnderstanding": "string",
    "competencySelection": "string",
    "responsibilityDesign": "string",
    "evidenceClassification": "string",
    "qualificationAndKpi": "string"
  },
  "teamMission": "string",
  "teamOutputs": ["string"],
  "teamResponsibilities": ["string"],
  "stakeholders": ["string"],
  "suggestedRoles": [{"title": "string", "purpose": "string"}],
  "primaryRole": {
    "title": "string", "mission": "string", "outputs": ["string"],
    "responsibilities": [{"content": "string", "ncsCodes": ["string"], "basis": "company|team_input|ncs|ai_inference"}],
    "requiredQualifications": [{"content": "string", "ncsCodes": ["string"], "basis": "company|team_input|ncs|ai_inference"}],
    "preferredQualifications": [{"content": "string", "ncsCodes": ["string"], "basis": "company|team_input|ncs|ai_inference"}],
    "tools": ["string"], "stakeholders": ["string"],
    "kpis": [{"name": "string", "measure": "string", "cadence": "string", "targetGuide": "string", "rationale": "string"}]
  },
  "ncsMappings": [{"ncsCode": "string", "rationale": "string", "matchStrength": "high|medium|low", "matchedInputs": ["string"]}]
}`;
  const encoded = await generateStructured<Record<string, unknown>>([{ text: prompt }], encodedPayloadSchema, "직무설계 초안 생성");
  return normalizeDesign(parseEncodedPayload(encoded, "직무설계 초안 생성"), input);
}

export async function validateGroundedDesign(input: {
  organizationName: string;
  company: CompanyContext;
  teamName: string;
  teamRole: string;
  roleTitleHint: string | null;
  candidates: NcsCandidate[];
  design: TeamDesign;
  revisionLabel: "v1.0" | "v1.1";
}): Promise<ValidationResult> {
  const prompt = `당신은 NCS 근거 직무기술서의 독립 검토자입니다. ${input.revisionLabel} 초안을 검토하고 필요한 수정을 design에 반영하세요.

[회사]
${input.organizationName}
${JSON.stringify(input.company)}

[팀 입력]
팀명: ${input.teamName}
팀 역할: ${input.teamRole}

[허용된 NCS 후보]
${JSON.stringify(input.candidates)}

[검토 대상]
${JSON.stringify(input.design)}

[필수 검토]
- 회사 및 팀 맥락과 직무 미션의 일관성
- 서로 다른 산업분류가 잘못 섞이지 않았는지
- 책임별 NCS 코드가 실제 과업과 연결되는지
- NCS에 없는 회사 고유 책임이 company 또는 team_input 근거로 구분됐는지
- 확인되지 않은 학위, 연차, 자격증이 필수요건으로 발명되지 않았는지
- KPI가 측정방법, 주기, 목표 설정 방법, 근거를 포함하는지
- 허용 목록에 없는 NCS 코드는 모두 제거할 것
- reasoningNotes가 실제 판단 근거를 담고 있는지, 수정 사항이 있다면 해당 단계의 노트도 그에 맞게 갱신했는지
- teamMission과 primaryRole.mission이 회사 mission뿐 아니라 vision의 방향성과 coreValues 중 최소 1개를 반영하는지. mission만 희미하게 echo하고 vision·coreValues가 전혀 안 보이면 design에서 직접 보완할 것. reasoningNotes.contextUnderstanding도 실제 mission·vision·coreValues 내용을 구체적으로 인용하도록 고칠 것
- 미션·책임 문장이 "~한다"체이고 근거 없는 수식어("혁신적인", "최고의" 등)가 없는지, 자격요건이 명사구로 통일되어 있는지 — 어긋나는 문장은 design에서 직접 고칠 것

근거 충실도 점수는 시스템이 design과 findings에서 직접 계산하므로 당신이 점수를 매길 필요는 없습니다. 대신 그 계산의 입력이 되는 두 가지를 정확하게 채우세요.

[정확도가 중요한 두 필드]
- 각 항목의 basis: 회사 자료로 뒷받침되면 "company", 팀 입력에 있으면 "team_input", NCS 능력단위에서 나왔으면 "ncs", 어디에서도 확인되지 않고 당신이 만들어낸 문장이면 반드시 "ai_inference"로 표시합니다. 근거가 없는데 company나 ncs로 표시하지 마세요.
- 각 finding의 severity: 문장 다듬기 수준의 제안은 "info", 근거가 약하거나 회사 맥락과 어긋나는 내용은 "warning", 발명된 자격요건·연차·수치처럼 사용자에게 잘못된 정보를 주는 문제는 "critical"로 표시합니다. 전부 info로 표시하지 마세요.

응답 객체의 payload에는 다음 키를 가진 JSON 객체를 문자열로 직렬화해 넣으세요. 마크다운 코드블록은 사용하지 않습니다.
- status: passed | passed_with_notes | needs_review
- summary: 검토 요약
- findings: [{severity: info|warning|critical, category: string, message: string}]
- design: 검토와 수정을 반영한 완전한 직무설계 객체. 입력된 [검토 대상]과 동일한 키 구조를 모두 유지합니다. reasoningNotes를 수정할 때도 "필터링", "매칭" 같은 개발 용어 대신 인사·조직설계 용어로 씁니다.`;
  const encoded = await generateStructured<Record<string, unknown>>([{ text: prompt }], encodedPayloadSchema, "NCS 독립 검토");
  const raw = parseEncodedPayload(encoded, "NCS 독립 검토");
  const statusValue = textValue(raw.status);
  const status: ValidationResult["status"] = ["passed", "passed_with_notes", "needs_review"].includes(statusValue)
    ? statusValue as ValidationResult["status"]
    : "passed_with_notes";
  const findings = Array.isArray(raw.findings) ? raw.findings.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const message = textValue(record.message);
    if (!message) return [];
    const severityValue = textValue(record.severity);
    const severity: "info" | "warning" | "critical" = ["info", "warning", "critical"].includes(severityValue)
      ? severityValue as "info" | "warning" | "critical"
      : "info";
    return [{ severity, category: textValue(record.category, "일반"), message }];
  }).slice(0, 12) : [];
  const rawDesign = raw.design && typeof raw.design === "object" ? raw.design as Record<string, unknown> : input.design as unknown as Record<string, unknown>;
  const design = normalizeDesign(rawDesign, input);
  return {
    status,
    coverageScore: computeCoverageScore(design, findings),
    summary: textValue(raw.summary, "NCS 및 회사 맥락 검토가 완료되었습니다."),
    findings,
    design,
  };
}
