import { stringArray } from "./company-context";

export type NcsCodeValidationFinding = {
  severity: "info";
  category: string;
  message: string;
};

export function filterAllowedNcsCodes(
  value: unknown,
  allowedCodes: Set<string>,
  discardedCodes: Set<string>,
  max = 3,
): string[] {
  const codes = stringArray(value, max);
  codes.forEach((code) => {
    if (!allowedCodes.has(code)) discardedCodes.add(code);
  });
  return codes.filter((code) => allowedCodes.has(code));
}

export function discardedNcsCodeFinding(codes: string[]): NcsCodeValidationFinding | null {
  const uniqueCodes = [...new Set(codes)].sort();
  if (uniqueCodes.length === 0) return null;

  const preview = uniqueCodes.slice(0, 5).join(", ");
  const remainder = uniqueCodes.length > 5 ? ` 외 ${uniqueCodes.length - 5}건` : "";
  return {
    severity: "info",
    category: "NCS 코드 검증",
    message: `AI가 제안한 능력단위 코드 ${uniqueCodes.length}건(${preview}${remainder})이 검색 후보에 없어 제외되었습니다.`,
  };
}
