export const safeFileName = (name: string) =>
  name.normalize("NFKC").replace(/[^가-힣a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-120) || "company-source";

export const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

export const confidenceForMatchStrength = (matchStrength: "high" | "medium" | "low" | undefined) =>
  matchStrength === "high" ? 0.9 : matchStrength === "low" ? 0.5 : 0.7;
