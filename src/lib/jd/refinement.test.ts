import { describe, expect, it } from "vitest";
import { groundedItemsFromSnapshot, preserveUnchangedGrounding } from "./refinement";

describe("preserveUnchangedGrounding", () => {
  const previous = [
    { content: "시장 데이터를 분석한다", basis: "ncs" as const, ncsCodes: ["0201030101_25v1"] },
    { content: "월간 보고서를 작성한다", basis: "company" as const, ncsCodes: [] },
  ];

  it("keeps grounding by exact content even when lines are reordered", () => {
    expect(preserveUnchangedGrounding([
      "월간 보고서를 작성한다",
      "시장 데이터를 분석한다",
    ], previous)).toEqual([
      { content: "월간 보고서를 작성한다", basis: "company", ncsCodes: [] },
      { content: "시장 데이터를 분석한다", basis: "ncs", ncsCodes: ["0201030101_25v1"] },
    ]);
  });

  it("treats changed and new lines as team input", () => {
    expect(preserveUnchangedGrounding([
      "시장·고객 데이터를 분석한다",
      "신규 보고서를 작성한다",
    ], previous)).toEqual([
      { content: "시장·고객 데이터를 분석한다", basis: "team_input", ncsCodes: [] },
      { content: "신규 보고서를 작성한다", basis: "team_input", ncsCodes: [] },
    ]);
  });
});

describe("groundedItemsFromSnapshot", () => {
  it("reads valid grounding and safely normalizes invalid metadata", () => {
    expect(groundedItemsFromSnapshot([
      { content: "유효한 항목", basis: "ncs", ncsCodes: ["A", 1] },
      { content: "근거가 잘못된 항목", basis: "unknown", ncsCodes: null },
      { basis: "company", ncsCodes: [] },
    ])).toEqual([
      { content: "유효한 항목", basis: "ncs", ncsCodes: ["A"] },
      { content: "근거가 잘못된 항목", basis: "ai_inference", ncsCodes: [] },
    ]);
  });
});
