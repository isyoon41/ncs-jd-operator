type JdVersionNumber = {
  version_major: number;
  version_minor: number;
};

export function formatJdVersion(version: JdVersionNumber): string {
  return `v${version.version_major}.${version.version_minor}`;
}

export function isRefinableJdVersion(version: JdVersionNumber): boolean {
  return version.version_major === 1;
}

export function nextJdVersion(version: JdVersionNumber) {
  const versionMinor = version.version_minor + 1;

  return {
    versionMajor: version.version_major,
    versionMinor,
    label: formatJdVersion({
      version_major: version.version_major,
      version_minor: versionMinor,
    }),
  };
}
