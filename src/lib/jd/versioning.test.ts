import { describe, expect, it } from "vitest";
import { formatJdVersion, isRefinableJdVersion, nextJdVersion } from "./versioning";

describe("JD semantic versioning", () => {
  it("formats the persisted major and minor version", () => {
    expect(formatJdVersion({ version_major: 1, version_minor: 7 })).toBe("v1.7");
  });

  it("increments every refinement without imposing a one-update cap", () => {
    expect(nextJdVersion({ version_major: 1, version_minor: 1 })).toEqual({
      versionMajor: 1,
      versionMinor: 2,
      label: "v1.2",
    });
    expect(nextJdVersion({ version_major: 1, version_minor: 27 }).label).toBe("v1.28");
  });

  it("keeps every v1.x revision eligible for another refinement", () => {
    expect(isRefinableJdVersion({ version_major: 1, version_minor: 0 })).toBe(true);
    expect(isRefinableJdVersion({ version_major: 1, version_minor: 27 })).toBe(true);
    expect(isRefinableJdVersion({ version_major: 0, version_minor: 9 })).toBe(false);
  });
});
