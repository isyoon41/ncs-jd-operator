import type { TeamDesign, ValidationResult } from "./company-designer";

export function computeCoverageScore(design: TeamDesign, findings: ValidationResult["findings"]): number {
  const groundedItems = [
    ...design.primaryRole.responsibilities,
    ...design.primaryRole.requiredQualifications,
    ...design.primaryRole.preferredQualifications,
  ];
  if (groundedItems.length === 0) return 0;

  const inferredRatio = groundedItems.filter((item) => item.basis === "ai_inference").length / groundedItems.length;
  const criticalCount = findings.filter((finding) => finding.severity === "critical").length;
  const warningCount = findings.filter((finding) => finding.severity === "warning").length;
  const lowMatchCount = design.ncsMappings.filter((mapping) => mapping.matchStrength === "low").length;

  const penalty = inferredRatio * 60 + criticalCount * 15 + warningCount * 5 + lowMatchCount * 3;
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}
