import { describe, expect, it } from "vitest";
import { discardedNcsCodeFinding, filterAllowedNcsCodes } from "./ncs-code-validation";

describe("filterAllowedNcsCodes", () => {
  it("keeps allowed codes and records rejected codes", () => {
    const discarded = new Set<string>();
    expect(filterAllowedNcsCodes(["ALLOWED", "INVALID", "ALLOWED"], new Set(["ALLOWED"]), discarded))
      .toEqual(["ALLOWED", "ALLOWED"]);
    expect([...discarded]).toEqual(["INVALID"]);
  });
});

describe("discardedNcsCodeFinding", () => {
  it("returns no finding when no code was discarded", () => {
    expect(discardedNcsCodeFinding([])).toBeNull();
  });

  it("summarizes unique discarded codes in a visible information finding", () => {
    expect(discardedNcsCodeFinding(["B", "A", "B"])).toEqual({
      severity: "info",
      category: "NCS 코드 검증",
      message: "AI가 제안한 능력단위 코드 2건(A, B)이 검색 후보에 없어 제외되었습니다.",
    });
  });
});
