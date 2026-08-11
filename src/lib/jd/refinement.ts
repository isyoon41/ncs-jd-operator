import type { GroundedItem } from "./company-designer";

const groundedBases = new Set<GroundedItem["basis"]>(["company", "team_input", "ncs", "ai_inference"]);

export function groundedItemsFromSnapshot(value: unknown): GroundedItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): GroundedItem[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    if (typeof record.content !== "string" || !record.content) return [];

    const basis = typeof record.basis === "string" && groundedBases.has(record.basis as GroundedItem["basis"])
      ? record.basis as GroundedItem["basis"]
      : "ai_inference";
    const ncsCodes = Array.isArray(record.ncsCodes)
      ? record.ncsCodes.filter((code): code is string => typeof code === "string")
      : [];

    return [{ content: record.content, basis, ncsCodes }];
  });
}

export function preserveUnchangedGrounding(items: string[], previousItems: GroundedItem[]): GroundedItem[] {
  const previousByContent = new Map(previousItems.map((item) => [item.content, item]));

  return items.map((content) => {
    const previous = previousByContent.get(content);
    return previous
      ? { content, basis: previous.basis, ncsCodes: [...previous.ncsCodes] }
      : { content, basis: "team_input", ncsCodes: [] };
  });
}
