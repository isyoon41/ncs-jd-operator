import { describe, expect, it } from "vitest";
import { confidenceForMatchStrength, escapeLikePattern, safeFileName } from "./text-utils";

describe("safeFileName", () => {
  it("keeps Korean, alphanumeric, and safe punctuation untouched", () => {
    expect(safeFileName("회사소개_2026.pdf")).toBe("회사소개_2026.pdf");
  });

  it("collapses unsafe characters into hyphens and trims edges", () => {
    expect(safeFileName("  weird/name??.pdf  ")).toBe("weird-name-.pdf");
  });

  it("falls back to a default name when nothing safe remains", () => {
    expect(safeFileName("???")).toBe("company-source");
  });

  it("caps length to the last 120 characters", () => {
    const long = "a".repeat(200) + ".pdf";
    const result = safeFileName(long);
    expect(result.length).toBeLessThanOrEqual(120);
    expect(result.endsWith(".pdf")).toBe(true);
  });
});

describe("escapeLikePattern", () => {
  it("escapes % and _ so they are treated as literal characters", () => {
    expect(escapeLikePattern("R&D_Team")).toBe("R&D\\_Team");
    expect(escapeLikePattern("100%_Sure")).toBe("100\\%\\_Sure");
  });

  it("escapes backslashes themselves", () => {
    expect(escapeLikePattern("back\\slash")).toBe("back\\\\slash");
  });

  it("leaves ordinary team names untouched", () => {
    expect(escapeLikePattern("사업개발팀")).toBe("사업개발팀");
  });
});

describe("confidenceForMatchStrength", () => {
  it("maps high to 0.9", () => {
    expect(confidenceForMatchStrength("high")).toBe(0.9);
  });

  it("maps medium to 0.7", () => {
    expect(confidenceForMatchStrength("medium")).toBe(0.7);
  });

  it("maps low to 0.5", () => {
    expect(confidenceForMatchStrength("low")).toBe(0.5);
  });

  it("defaults unknown/undefined to 0.7", () => {
    expect(confidenceForMatchStrength(undefined)).toBe(0.7);
  });
});
