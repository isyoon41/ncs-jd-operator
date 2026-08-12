import { describe, expect, it } from "vitest";
import { hasCompanyDesignBasis, normalizeCompanyContext } from "./company-context";

// 배열 필드는 전부 화면에서 .join()으로 렌더된다. 하나라도 undefined면 페이지가 죽으므로
// 어떤 입력이 와도 배열이 보장되는지가 이 테스트의 핵심이다.
const ARRAY_FIELDS = [
  "coreValues",
  "businessAreas",
  "productsServices",
  "customers",
  "strategicPriorities",
  "culture",
  "valueChain",
  "technologyAssets",
  "regulatoryConstraints",
  "differentiators",
  "keyTerms",
  "uncertainties",
] as const;

describe("normalizeCompanyContext", () => {
  it("fills in fields added after an old profile was saved", () => {
    // MVC 기능 이전에 저장된 실제 프로필 모양 — mission/vision/coreValues가 아예 없다
    const legacy = { summary: "요약", businessAreas: ["제조"], keyTerms: ["오존"] };
    const profile = normalizeCompanyContext(legacy);

    expect(profile.mission).toBe("");
    expect(profile.vision).toBe("");
    expect(profile.coreValues).toEqual([]);
    expect(profile.summary).toBe("요약");
    expect(profile.businessAreas).toEqual(["제조"]);
  });

  it.each([null, undefined, "문자열", 42, []])("returns arrays for every list field given %p", (input) => {
    const profile = normalizeCompanyContext(input);
    for (const field of ARRAY_FIELDS) {
      expect(Array.isArray(profile[field]), `${field} must be an array`).toBe(true);
    }
  });

  it("drops non-string and blank entries instead of passing them through", () => {
    const profile = normalizeCompanyContext({ coreValues: ["신뢰", "", null, 7, "  속도  "] });
    expect(profile.coreValues).toEqual(["신뢰", "속도"]);
  });

  it("keeps a stated mvcBasis and defaults anything else to inferred", () => {
    expect(normalizeCompanyContext({ mvcBasis: "stated" }).mvcBasis).toBe("stated");
    expect(normalizeCompanyContext({ mvcBasis: "guessed" }).mvcBasis).toBe("inferred");
    expect(normalizeCompanyContext({}).mvcBasis).toBe("inferred");
  });

  it("normalizes nested design-basis and review fields from JSON", () => {
    const profile = normalizeCompanyContext({
      designBasis: {
        valueCreationLogic: "고객 과제를 기술 솔루션으로 전환한다.",
        criticalCapabilities: ["기술 제안", null, "  고객 검증  "],
        roleDesignGuardrails: ["규제 검토를 책임에 포함한다"],
      },
      basisValidation: {
        status: "ready",
        summary: "회사 사실과 일치함",
        findings: [{ severity: "warning", message: "  일부 시장 정보는 확인 필요  " }],
      },
    });

    expect(profile.designBasis.criticalCapabilities).toEqual(["기술 제안", "고객 검증"]);
    expect(profile.basisValidation.status).toBe("ready");
    expect(profile.basisValidation.findings).toEqual([{ severity: "warning", message: "일부 시장 정보는 확인 필요" }]);
    expect(hasCompanyDesignBasis(profile)).toBe(true);
  });

  it("does not treat a partial legacy basis as ready for job design", () => {
    const profile = normalizeCompanyContext({ designBasis: { valueCreationLogic: "가치 창출" } });
    expect(hasCompanyDesignBasis(profile)).toBe(false);
  });
});
