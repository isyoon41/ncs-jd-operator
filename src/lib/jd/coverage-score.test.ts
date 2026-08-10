import { describe, expect, it } from "vitest";
import { computeCoverageScore } from "./coverage-score";
import type { TeamDesign, ValidationResult } from "./company-designer";

function design(overrides: {
  bases?: TeamDesign["primaryRole"]["responsibilities"][number]["basis"][];
  matchStrengths?: TeamDesign["ncsMappings"][number]["matchStrength"][];
}): TeamDesign {
  return {
    reasoningNotes: {
      contextUnderstanding: "",
      competencySelection: "",
      responsibilityDesign: "",
      evidenceClassification: "",
      qualificationAndKpi: "",
    },
    teamMission: "",
    teamOutputs: [],
    teamResponsibilities: [],
    stakeholders: [],
    suggestedRoles: [],
    primaryRole: {
      title: "",
      mission: "",
      outputs: [],
      responsibilities: (overrides.bases ?? []).map((basis) => ({ content: "책임", ncsCodes: [], basis })),
      requiredQualifications: [],
      preferredQualifications: [],
      tools: [],
      stakeholders: [],
      kpis: [],
    },
    ncsMappings: (overrides.matchStrengths ?? []).map((matchStrength) => ({
      ncsCode: "1501020207_14v2",
      rationale: "",
      matchStrength,
      matchedInputs: [],
    })),
  };
}

const noFindings: ValidationResult["findings"] = [];

describe("computeCoverageScore", () => {
  it("gives a perfect score when every sentence is grounded and nothing was flagged", () => {
    expect(computeCoverageScore(design({ bases: ["company", "ncs", "team_input"] }), noFindings)).toBe(100);
  });

  it("returns 0 when there is nothing to score", () => {
    expect(computeCoverageScore(design({}), noFindings)).toBe(0);
  });

  it("penalizes by the share of AI-inferred sentences, not their raw count", () => {
    const oneOfFour = computeCoverageScore(design({ bases: ["ai_inference", "ncs", "ncs", "ncs"] }), noFindings);
    const twoOfFour = computeCoverageScore(design({ bases: ["ai_inference", "ai_inference", "ncs", "ncs"] }), noFindings);
    expect(oneOfFour).toBe(85);
    expect(twoOfFour).toBe(70);
  });

  it("weighs critical findings more heavily than warnings, and ignores info", () => {
    const grounded = design({ bases: ["ncs"] });
    const info = computeCoverageScore(grounded, [{ severity: "info", category: "문체", message: "m" }]);
    const warning = computeCoverageScore(grounded, [{ severity: "warning", category: "근거", message: "m" }]);
    const critical = computeCoverageScore(grounded, [{ severity: "critical", category: "발명", message: "m" }]);
    expect(info).toBe(100);
    expect(warning).toBe(95);
    expect(critical).toBe(85);
  });

  it("deducts for weakly matched NCS units", () => {
    expect(computeCoverageScore(design({ bases: ["ncs"], matchStrengths: ["low", "high"] }), noFindings)).toBe(97);
  });

  it("never drops below zero when problems stack up", () => {
    const score = computeCoverageScore(
      design({ bases: ["ai_inference"], matchStrengths: ["low", "low"] }),
      Array.from({ length: 5 }, () => ({ severity: "critical" as const, category: "발명", message: "m" })),
    );
    expect(score).toBe(0);
  });
});
