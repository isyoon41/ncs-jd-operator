import { describe, expect, it } from "vitest";
import { rankNcsCandidates, scoreNcsCandidate, type SearchableNcsCandidate } from "./ncs-retrieval";

const candidate = (overrides: Partial<SearchableNcsCandidate>): SearchableNcsCandidate => ({
  ncsCode: "0200000000_25v1",
  name: "기본 능력단위",
  definition: null,
  lclasName: "경영·회계·사무",
  mclasName: null,
  sclasName: null,
  subdName: null,
  ...overrides,
});

describe("scoreNcsCandidate", () => {
  it("scores an exact name match above a definition-only match even outside the preferred major", () => {
    const plan = { majorCodes: ["02"], searchTerms: ["시장 분석"] };
    const exactName = candidate({ ncsCode: "1000000000_25v1", name: "시장 분석" });
    const preferredMajorDefinition = candidate({ definition: "시장 분석 자료를 활용하는 능력이다" });

    expect(scoreNcsCandidate(exactName, plan)).toBeGreaterThan(scoreNcsCandidate(preferredMajorDefinition, plan));
  });

  it("uses the major code as a ranking bonus instead of a hard filter", () => {
    const plan = { majorCodes: ["02"], searchTerms: ["데이터 분석"] };
    const preferred = candidate({ name: "데이터 분석" });
    const other = candidate({ ncsCode: "2000000000_25v1", name: "데이터 분석" });

    expect(scoreNcsCandidate(preferred, plan)).toBeGreaterThan(scoreNcsCandidate(other, plan));
  });
});

describe("rankNcsCandidates", () => {
  it("orders candidates by relevance rather than input order and keeps definition matches", () => {
    const definitionMatch = candidate({ ncsCode: "0200000002_25v1", name: "사업 자료 정리", definition: "시장 분석 결과를 정리한다" });
    const nameMatch = candidate({ ncsCode: "1000000001_25v1", name: "시장 분석" });

    expect(rankNcsCandidates([definitionMatch, nameMatch], { majorCodes: ["02"], searchTerms: ["시장 분석"] }))
      .toEqual([nameMatch, definitionMatch]);
  });

  it("applies the result cap after ranking", () => {
    const candidates = Array.from({ length: 60 }, (_, index) => candidate({
      ncsCode: `02${String(index).padStart(8, "0")}_25v1`,
      name: index === 59 ? "시장 분석" : `시장 분석 ${index}`,
    }));

    const ranked = rankNcsCandidates(candidates, { majorCodes: ["02"], searchTerms: ["시장 분석"] }, 50);
    expect(ranked).toHaveLength(50);
    expect(ranked[0].ncsCode).toBe("0200000059_25v1");
  });
});
