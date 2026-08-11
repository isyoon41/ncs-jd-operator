import fs from "node:fs";

export const ACCOUNT_SOURCE_URL =
  "https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=FILE_000000003512892&fileDetailSn=1&insertDataPrcus=N";

export const PORTAL_DETAIL_URL =
  "https://www.ncs.go.kr/unity/hth01/hth0101/ncsResultSearchList.do";

const ACCOUNT_COLUMNS = {
  createdAt: "생성일자",
  lclasName: "NCS대분류코드명",
  mclasName: "NCS중분류코드명",
  sclasName: "NCS소분류코드명",
  subdName: "NCS세분류코드명",
  code: "NCS분류코드",
  name: "능력단위명",
  definition: "능력단위정의",
  level: "능력단위수준",
};

export function loadEnvFile(path) {
  if (!fs.existsSync(path)) return;

  for (const raw of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

export function* parseCsv(text) {
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && character === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      cell = "";
      if (row.some((value) => value !== "")) yield row;
      row = [];
      continue;
    }

    cell += character;
  }

  if (cell || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value !== "")) yield row;
  }
}

function clean(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function columnIndexes(header) {
  const normalized = header.map((value) => clean(value).replace(/^\uFEFF/, ""));
  const indexes = {};

  for (const [key, label] of Object.entries(ACCOUNT_COLUMNS)) {
    const index = normalized.indexOf(label);
    if (index < 0) throw new Error(`공식 CSV 필수 컬럼이 없습니다: ${label}`);
    indexes[key] = index;
  }

  return indexes;
}

function newer(current, candidate) {
  return !current || candidate.createdAt >= current.createdAt;
}

export function parseAccountSource(buffer, encoding = "euc-kr") {
  const text = new TextDecoder(encoding).decode(buffer);
  const rows = parseCsv(text);
  const header = rows.next();
  if (header.done) throw new Error("공식 CSV가 비어 있습니다.");

  const indexes = columnIndexes(header.value);
  const exact = new Map();
  const hierarchies = new Map();
  let rowCount = 0;
  let missingCodeRows = 0;
  let conflictingDefinitions = 0;

  for (const row of rows) {
    rowCount += 1;
    const code = clean(row[indexes.code]);
    if (!code) {
      missingCodeRows += 1;
      continue;
    }

    const candidate = {
      createdAt: clean(row[indexes.createdAt]),
      ncs_code: code,
      name: clean(row[indexes.name]),
      level: clean(row[indexes.level]) || null,
      definition: clean(row[indexes.definition]) || null,
      lclas_name: clean(row[indexes.lclasName]) || null,
      mclas_name: clean(row[indexes.mclasName]) || null,
      sclas_name: clean(row[indexes.sclasName]) || null,
      subd_name: clean(row[indexes.subdName]) || null,
    };

    const previous = exact.get(code);
    if (
      previous?.definition &&
      candidate.definition &&
      previous.definition !== candidate.definition
    ) {
      conflictingDefinitions += 1;
    }
    if (newer(previous, candidate)) exact.set(code, candidate);

    const hierarchyCode = code.slice(0, 8);
    const hierarchy = hierarchies.get(hierarchyCode);
    if (newer(hierarchy, candidate)) {
      hierarchies.set(hierarchyCode, {
        createdAt: candidate.createdAt,
        lclas_name: candidate.lclas_name,
        mclas_name: candidate.mclas_name,
        sclas_name: candidate.sclas_name,
        subd_name: candidate.subd_name,
      });
    }
  }

  return {
    exact,
    hierarchies,
    stats: {
      rowCount,
      exactCodes: exact.size,
      hierarchyCodes: hierarchies.size,
      missingCodeRows,
      conflictingDefinitions,
    },
  };
}

export function parseDutyKind(dutyKind) {
  const parts = clean(dutyKind)
    .split(">")
    .map((part) => part.trim().replace(/^\d{2}\./, "").trim())
    .filter(Boolean);

  if (parts.length !== 4) return null;
  return {
    lclas_name: parts[0],
    mclas_name: parts[1],
    sclas_name: parts[2],
    subd_name: parts[3],
  };
}

export function mergeOfficialData(existing, exact, hierarchy, portalDetail, portalHierarchy) {
  const merged = {
    ncs_code: existing.ncs_code,
    name: existing.name,
    level: existing.level,
    definition: existing.definition,
    lclas_name: existing.lclas_name,
    mclas_name: existing.mclas_name,
    sclas_name: existing.sclas_name,
    subd_name: existing.subd_name,
  };

  const classification = portalHierarchy ?? hierarchy ?? exact;
  for (const field of ["lclas_name", "mclas_name", "sclas_name", "subd_name"]) {
    if (classification?.[field]) merged[field] = classification[field];
  }

  if (exact?.name) merged.name = exact.name;
  if (exact?.level) merged.level = String(exact.level);
  if (exact?.definition) merged.definition = exact.definition;

  if (portalDetail?.name) merged.name = portalDetail.name;
  if (portalDetail?.level) merged.level = String(portalDetail.level);
  if (portalDetail?.definition) merged.definition = portalDetail.definition;

  return merged;
}

export function changedFields(existing, merged) {
  const fields = [
    "name",
    "level",
    "definition",
    "lclas_name",
    "mclas_name",
    "sclas_name",
    "subd_name",
  ];

  return fields.filter((field) => (existing[field] ?? null) !== (merged[field] ?? null));
}
