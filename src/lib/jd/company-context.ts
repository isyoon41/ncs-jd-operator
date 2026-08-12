// 순수 변환 헬퍼만 모아둔 모듈. company-designer.ts는 "server-only"라 테스트에서 불러올 수
// 없으므로, 값 정규화 로직은 여기에 두고 타입만 type-only import로 가져온다(런타임에 지워짐).
import type {
  CompanyBasisValidation,
  CompanyContext,
  CompanyDesignBasis,
  CompanyFact,
} from "./company-designer";

export const stringArray = (value: unknown, max = 12) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, max)
    : [];

export const textValue = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const objectValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export const emptyCompanyDesignBasis = (): CompanyDesignBasis => ({
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
});

export function normalizeCompanyFacts(value: unknown): CompanyFact[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): CompanyFact[] => {
    const raw = objectValue(item);
    const statement = textValue(raw.statement);
    if (!statement) return [];
    const confidenceValue = textValue(raw.confidence);
    return [{
      category: textValue(raw.category, "기타"),
      statement,
      basis: textValue(raw.basis) === "inferred" ? "inferred" : "stated",
      confidence: ["high", "medium", "low"].includes(confidenceValue)
        ? confidenceValue as CompanyFact["confidence"]
        : "medium",
    }];
  }).slice(0, 40);
}

export function normalizeCompanyDesignBasis(value: unknown): CompanyDesignBasis {
  const raw = objectValue(value);
  return {
    valueCreationLogic: textValue(raw.valueCreationLogic),
    strategicFocus: stringArray(raw.strategicFocus, 8),
    coreValueChain: stringArray(raw.coreValueChain, 12),
    criticalCapabilities: stringArray(raw.criticalCapabilities, 12),
    coreProcesses: stringArray(raw.coreProcesses, 12),
    operatingPrinciples: stringArray(raw.operatingPrinciples, 10),
    organizationDesignPrinciples: stringArray(raw.organizationDesignPrinciples, 10),
    talentPriorities: stringArray(raw.talentPriorities, 10),
    roleDesignGuardrails: stringArray(raw.roleDesignGuardrails, 10),
    ncsSearchAnchors: stringArray(raw.ncsSearchAnchors, 20),
  };
}

export function normalizeCompanyBasisValidation(value: unknown): CompanyBasisValidation {
  const raw = objectValue(value);
  const findings = Array.isArray(raw.findings) ? raw.findings.flatMap((item) => {
    const finding = objectValue(item);
    const message = textValue(finding.message);
    if (!message) return [];
    const severityValue = textValue(finding.severity);
    return [{
      severity: ["info", "warning", "critical"].includes(severityValue)
        ? severityValue as CompanyBasisValidation["findings"][number]["severity"]
        : "info" as const,
      message,
    }];
  }).slice(0, 12) : [];
  return {
    status: textValue(raw.status) === "ready" ? "ready" : "needs_review",
    summary: textValue(raw.summary),
    findings,
  };
}

export function hasCompanyDesignBasis(value: CompanyContext): boolean {
  return Boolean(
    value.designBasis.valueCreationLogic
    && value.designBasis.criticalCapabilities.length > 0
    && value.designBasis.roleDesignGuardrails.length > 0,
  );
}

// DB에 저장된 structured_context는 저장 시점의 스키마를 따른다. mission/vision/coreValues처럼
// 나중에 추가된 필드는 예전 프로필에 아예 없으므로, 읽는 쪽에서 필드가 전부 있다고 가정하면
// 배열에 .join()을 호출하는 순간 페이지가 죽는다. 오래된 행도 안전하게 읽히도록 채워 넣는다.
export function normalizeCompanyContext(value: unknown): CompanyContext {
  const raw = objectValue(value);
  return {
    summary: textValue(raw.summary),
    mission: textValue(raw.mission),
    vision: textValue(raw.vision),
    coreValues: stringArray(raw.coreValues, 6),
    mvcBasis: textValue(raw.mvcBasis) === "stated" ? "stated" : "inferred",
    businessAreas: stringArray(raw.businessAreas, 8),
    productsServices: stringArray(raw.productsServices, 10),
    customers: stringArray(raw.customers, 8),
    businessModel: textValue(raw.businessModel),
    growthStage: textValue(raw.growthStage),
    strategicPriorities: stringArray(raw.strategicPriorities, 8),
    culture: stringArray(raw.culture, 8),
    keyTerms: stringArray(raw.keyTerms, 16),
    uncertainties: stringArray(raw.uncertainties, 8),
    valueChain: stringArray(raw.valueChain, 12),
    technologyAssets: stringArray(raw.technologyAssets, 12),
    regulatoryConstraints: stringArray(raw.regulatoryConstraints, 12),
    operatingModel: stringArray(raw.operatingModel, 12),
    differentiators: stringArray(raw.differentiators, 10),
    facts: normalizeCompanyFacts(raw.facts),
    designBasis: normalizeCompanyDesignBasis(raw.designBasis),
    basisValidation: normalizeCompanyBasisValidation(raw.basisValidation),
  };
}
