#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import {
  ACCOUNT_SOURCE_URL,
  PORTAL_DETAIL_URL,
  changedFields,
  loadEnvFile,
  mergeOfficialData,
  parseAccountSource,
  parseDutyKind,
} from "./ncs-sync-lib.mjs";

const HELP = `
공식 NCS 정의/분류 데이터 동기화

사용법:
  node scripts/sync-ncs-details.mjs --source <CSV 경로> [--portal] [--apply]

옵션:
  --source <path>              공공데이터포털 계좌 통계 CSV(CP949)
  --download-source            공식 CSV를 임시 폴더에 다운로드하거나 기존 파일 재사용
  --portal                     CSV에 없는 정의/분류를 NCS 공식 포털 상세조회로 보완
  --apply                      운영 Supabase에 반영 (기본은 dry-run)
  --limit <n>                  앞에서부터 n개 행만 처리 (소량 검증용)
  --workers <n>                포털 동시 요청 수 (기본 8)
  --requests-per-second <n>     포털 전체 요청 속도 상한 (기본 20)
  --batch-size <n>             Supabase upsert 배치 크기 (기본 200)
  --cache <path>               포털 응답 캐시 JSON 경로
  --refresh-portal             DB/캐시에 정의가 있어도 포털에서 다시 조회
  --allow-partial              일부 포털 조회 실패가 있어도 적용 허용
  --help                       도움말

안전장치:
  --apply가 없으면 DB를 변경하지 않습니다. 기존 DB에 있는 ncs_code만 갱신하며
  새로운 코드는 삽입하지 않습니다.
`;

const DEFAULT_CACHE = path.join(os.tmpdir(), "ncs-jd-official-details-cache.json");
const DEFAULT_SOURCE = path.join(os.tmpdir(), "ncs-account-stats-20250914.csv");
const DATABASE_FIELDS = [
  "ncs_code",
  "name",
  "level",
  "definition",
  "lclas_name",
  "mclas_name",
  "sclas_name",
  "subd_name",
  "synced_at",
];

function parseArgs(argv) {
  const options = {
    source: null,
    downloadSource: false,
    portal: false,
    apply: false,
    limit: 0,
    workers: 8,
    requestsPerSecond: 20,
    batchSize: 200,
    cache: DEFAULT_CACHE,
    refreshPortal: false,
    allowPartial: false,
    help: false,
  };

  const valueOptions = new Map([
    ["--source", "source"],
    ["--limit", "limit"],
    ["--workers", "workers"],
    ["--requests-per-second", "requestsPerSecond"],
    ["--batch-size", "batchSize"],
    ["--cache", "cache"],
  ]);
  const flagOptions = new Map([
    ["--download-source", "downloadSource"],
    ["--portal", "portal"],
    ["--apply", "apply"],
    ["--refresh-portal", "refreshPortal"],
    ["--allow-partial", "allowPartial"],
    ["--help", "help"],
    ["-h", "help"],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (flagOptions.has(argument)) {
      options[flagOptions.get(argument)] = true;
      continue;
    }
    if (valueOptions.has(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} 값이 필요합니다.`);
      options[valueOptions.get(argument)] = value;
      index += 1;
      continue;
    }
    throw new Error(`알 수 없는 옵션입니다: ${argument}`);
  }

  for (const key of ["limit", "workers", "requestsPerSecond", "batchSize"]) {
    options[key] = Number(options[key]);
    if (!Number.isFinite(options[key]) || options[key] < 0) {
      throw new Error(`${key}는 0 이상의 숫자여야 합니다.`);
    }
  }
  if (options.workers < 1 || options.batchSize < 1 || options.requestsPerSecond < 1) {
    throw new Error("workers, batch-size, requests-per-second는 1 이상이어야 합니다.");
  }

  return options;
}

async function downloadSource(target) {
  if (fs.existsSync(target) && fs.statSync(target).size > 1_000_000) {
    console.log(`공식 CSV 재사용: ${target}`);
    return target;
  }

  console.log(`공식 CSV 다운로드: ${ACCOUNT_SOURCE_URL}`);
  const response = await fetch(ACCOUNT_SOURCE_URL, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`공식 CSV 다운로드 실패: HTTP ${response.status}`);
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(target));
  return target;
}

function loadCache(cachePath) {
  if (!fs.existsSync(cachePath)) return { version: 1, details: {}, hierarchies: {} };
  const parsed = JSON.parse(fs.readFileSync(cachePath, "utf8"));
  return {
    version: 1,
    details: parsed.details ?? {},
    hierarchies: parsed.hierarchies ?? {},
  };
}

function saveCache(cachePath, cache) {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  const temporary = `${cachePath}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, cachePath);
}

function databaseHeaders(serviceKey, extra = {}) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    ...extra,
  };
}

async function fetchExistingRows(baseUrl, serviceKey) {
  const rows = [];
  const pageSize = 1_000;

  for (let offset = 0; ; offset += pageSize) {
    const query = new URLSearchParams({
      select: DATABASE_FIELDS.join(","),
      order: "ncs_code",
      limit: String(pageSize),
      offset: String(offset),
    });
    const response = await fetch(`${baseUrl}/rest/v1/ncs_competency_units?${query}`, {
      headers: databaseHeaders(serviceKey),
    });
    if (!response.ok) throw new Error(`Supabase 조회 실패: HTTP ${response.status}`);

    const page = await response.json();
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

class RateLimiter {
  constructor(requestsPerSecond) {
    this.interval = 1_000 / requestsPerSecond;
    this.nextAt = Date.now();
  }

  async wait() {
    const now = Date.now();
    const slot = Math.max(now, this.nextAt);
    this.nextAt = slot + this.interval;
    const delay = slot - now;
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

async function portalRequest(code, doCompetencyUnit, limiter) {
  const body = {
    ncsLclasCd: code.slice(0, 2),
    ncsMclasCd: code.slice(2, 4),
    ncsSclasCd: code.slice(4, 6),
    ncsSubdCd: code.slice(6, 8),
    ncsCompeUnitCd: code.slice(8, 10),
    ncsClCd: code,
    doCompeUnit: doCompetencyUnit ? "true" : "false",
    output: "ncsRsnInfo",
  };

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await limiter.wait();
    try {
      const response = await fetch(PORTAL_DETAIL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", AJAX: "true" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const info = (await response.json())?.data?.ncsRsnInfo?.defInfo;
      if (!info) throw new Error("defInfo가 없습니다.");

      if (doCompetencyUnit) {
        const returnedCode = String(info.ncsClCd ?? "").trim();
        const definition = String(info.compeUnitDef ?? "").replace(/\s+/g, " ").trim();
        if (returnedCode !== code || !definition) {
          throw new Error(`코드 불일치 또는 정의 누락(returned=${returnedCode || "empty"})`);
        }
        return {
          name: String(info.compeUnitName ?? "").trim(),
          level: String(info.compeUnitLevel ?? "").trim() || null,
          definition,
        };
      }

      const hierarchy = parseDutyKind(info.dutyKind);
      if (!hierarchy) throw new Error("분류 경로를 해석할 수 없습니다.");
      return hierarchy;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }

  throw lastError;
}

async function fetchConcurrently(items, options, fetcher) {
  let cursor = 0;
  let completed = 0;
  const failures = [];
  const results = new Map();
  const limiter = new RateLimiter(options.requestsPerSecond);
  const startedAt = Date.now();

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      const item = items[index];

      try {
        results.set(item.key, await fetcher(item, limiter));
      } catch (error) {
        failures.push({
          key: item.key,
          message: error instanceof Error ? error.message : String(error),
        });
      }

      completed += 1;
      if (completed % 250 === 0 || completed === items.length) {
        const seconds = Math.max(1, (Date.now() - startedAt) / 1_000);
        console.log(
          `포털 조회 ${completed}/${items.length} · 성공 ${results.size} · 실패 ${failures.length} · ${(completed / seconds).toFixed(1)} req/s`,
        );
      }
    }
  }

  await Promise.all(Array.from({ length: options.workers }, () => worker()));
  return { results, failures };
}

async function enrichFromPortal(rows, source, cache, options) {
  const detailItems = [];
  const representativeByHierarchy = new Map();
  const allFailures = [];

  for (const row of rows) {
    const exact = source.exact.get(row.ncs_code);
    const cached = cache.details[row.ncs_code];
    const hasDefinition = Boolean(exact?.definition || cached?.definition || row.definition);
    if (options.refreshPortal || !hasDefinition) {
      detailItems.push({ key: row.ncs_code, code: row.ncs_code });
    }

    const hierarchyCode = row.ncs_code.slice(0, 8);
    representativeByHierarchy.set(hierarchyCode, row.ncs_code);
  }

  if (detailItems.length > 0) {
    console.log(`포털 능력단위 정의 조회 대상: ${detailItems.length}개`);
    const { results, failures } = await fetchConcurrently(
      detailItems,
      options,
      (item, limiter) => portalRequest(item.code, true, limiter),
    );
    for (const [code, detail] of results) cache.details[code] = detail;
    allFailures.push(...failures);
  }

  const hierarchyItems = [];
  for (const [hierarchyCode, code] of representativeByHierarchy) {
    if (source.hierarchies.has(hierarchyCode) || cache.hierarchies[hierarchyCode]) continue;
    hierarchyItems.push({ key: hierarchyCode, code });
  }

  if (hierarchyItems.length > 0) {
    console.log(`포털 NCS 분류 경로 조회 대상: ${hierarchyItems.length}개`);
    const { results, failures } = await fetchConcurrently(
      hierarchyItems,
      options,
      (item, limiter) => portalRequest(item.code, false, limiter),
    );
    for (const [hierarchyCode, hierarchy] of results) {
      cache.hierarchies[hierarchyCode] = hierarchy;
    }
    allFailures.push(...failures);
  }

  return { failures: allFailures, cache };
}

function prepareUpdates(rows, source, cache) {
  const updates = [];
  const fieldCounts = {};

  for (const row of rows) {
    const code = row.ncs_code;
    const hierarchyCode = code.slice(0, 8);
    const merged = mergeOfficialData(
      row,
      source.exact.get(code),
      source.hierarchies.get(hierarchyCode),
      cache.details[code],
      cache.hierarchies[hierarchyCode],
    );
    const changed = changedFields(row, merged);
    if (changed.length === 0) continue;

    for (const field of changed) fieldCounts[field] = (fieldCounts[field] ?? 0) + 1;
    updates.push(merged);
  }

  return { updates, fieldCounts };
}

async function applyUpdates(baseUrl, serviceKey, updates, batchSize) {
  const syncedAt = new Date().toISOString();
  for (let offset = 0; offset < updates.length; offset += batchSize) {
    const batch = updates.slice(offset, offset + batchSize).map((row) => ({
      ...row,
      synced_at: syncedAt,
    }));
    const query = new URLSearchParams({ on_conflict: "ncs_code" });
    const response = await fetch(`${baseUrl}/rest/v1/ncs_competency_units?${query}`, {
      method: "POST",
      headers: databaseHeaders(serviceKey, {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify(batch),
    });
    if (!response.ok) {
      const body = (await response.text()).slice(0, 500);
      throw new Error(`Supabase upsert 실패: HTTP ${response.status} ${body}`);
    }
    console.log(`Supabase 반영 ${Math.min(offset + batch.length, updates.length)}/${updates.length}`);
  }
}

function coverage(rows) {
  return {
    definitions: rows.filter((row) => Boolean(row.definition)).length,
    fullClassifications: rows.filter((row) =>
      [row.lclas_name, row.mclas_name, row.sclas_name, row.subd_name].every(Boolean),
    ).length,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(HELP.trim());
    return;
  }

  loadEnvFile(path.join(process.cwd(), ".env.local"));
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  }

  if (options.downloadSource) options.source = await downloadSource(options.source ?? DEFAULT_SOURCE);
  if (!options.source) throw new Error("--source 또는 --download-source가 필요합니다.");
  if (!fs.existsSync(options.source)) throw new Error(`공식 CSV를 찾을 수 없습니다: ${options.source}`);

  console.log(`모드: ${options.apply ? "APPLY" : "DRY-RUN"}`);
  console.log(`공식 CSV 파싱: ${options.source}`);
  const source = parseAccountSource(fs.readFileSync(options.source));
  console.log(`공식 CSV 통계: ${JSON.stringify(source.stats)}`);

  const allRows = await fetchExistingRows(baseUrl, serviceKey);
  const rows = options.limit > 0 ? allRows.slice(0, options.limit) : allRows;
  console.log(`운영 DB 대상: ${rows.length}/${allRows.length}개`);
  const before = coverage(rows);

  const cache = loadCache(options.cache);
  if (options.portal) {
    const portal = await enrichFromPortal(rows, source, cache, options);
    saveCache(options.cache, portal.cache);
    if (portal.failures.length > 0) {
      console.error(`포털 조회 실패 ${portal.failures.length}건:`, portal.failures.slice(0, 10));
      if (options.apply && !options.allowPartial) {
        throw new Error("포털 조회 실패가 있어 DB 반영을 중단했습니다. 재실행하면 캐시부터 이어집니다.");
      }
    }
  }

  const { updates, fieldCounts } = prepareUpdates(rows, source, cache);
  const afterRows = rows.map((row) => {
    const code = row.ncs_code;
    return mergeOfficialData(
      row,
      source.exact.get(code),
      source.hierarchies.get(code.slice(0, 8)),
      cache.details[code],
      cache.hierarchies[code.slice(0, 8)],
    );
  });
  const after = coverage(afterRows);

  console.log(
    JSON.stringify(
      {
        mode: options.apply ? "apply" : "dry-run",
        databaseRows: allRows.length,
        selectedRows: rows.length,
        rowsToUpdate: updates.length,
        changedFieldCounts: fieldCounts,
        coverageBefore: before,
        coverageAfter: after,
        cachePath: options.cache,
      },
      null,
      2,
    ),
  );

  if (!options.apply) {
    console.log("DRY-RUN 완료: --apply가 없어 DB는 변경하지 않았습니다.");
    return;
  }
  if (updates.length === 0) {
    console.log("반영할 변경사항이 없습니다.");
    return;
  }

  await applyUpdates(baseUrl, serviceKey, updates, options.batchSize);
  console.log(`APPLY 완료: ${updates.length}개 행을 갱신했습니다.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
