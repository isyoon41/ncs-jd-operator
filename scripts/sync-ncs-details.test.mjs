import assert from "node:assert/strict";
import test from "node:test";
import {
  changedFields,
  mergeOfficialData,
  parseAccountSource,
  parseCsv,
  parseDutyKind,
} from "./ncs-sync-lib.mjs";

test("parseCsv handles commas, quotes, and embedded newlines", () => {
  const rows = [...parseCsv('a,b,c\r\n1,"two, too","line 1\nline 2"\r\n')];
  assert.deepEqual(rows, [
    ["a", "b", "c"],
    ["1", "two, too", "line 1\nline 2"],
  ]);
});

test("parseAccountSource keeps the newest official record", () => {
  const csv = [
    "생성일자,NCS대분류코드명,NCS중분류코드명,NCS소분류코드명,NCS세분류코드명,NCS분류코드,능력단위명,능력단위정의,능력단위수준",
    "2025-01-01,사업관리,사업관리,프로젝트관리,프로젝트관리,0101010101_17v2,이전 명칭,이전 정의,6",
    "2025-02-01,사업관리,사업관리,프로젝트관리,프로젝트관리,0101010101_17v2,최신 명칭,최신 정의,7",
  ].join("\r\n");
  const source = parseAccountSource(new TextEncoder().encode(csv), "utf-8");

  assert.equal(source.exact.size, 1);
  assert.equal(source.exact.get("0101010101_17v2").name, "최신 명칭");
  assert.equal(source.exact.get("0101010101_17v2").definition, "최신 정의");
});

test("parseDutyKind extracts four classification names", () => {
  assert.deepEqual(
    parseDutyKind("01.사업관리 > 01.사업관리 > 01.프로젝트관리 > 01.공적개발원조사업관리"),
    {
      lclas_name: "사업관리",
      mclas_name: "사업관리",
      sclas_name: "프로젝트관리",
      subd_name: "공적개발원조사업관리",
    },
  );
  assert.equal(parseDutyKind("분류 하나"), null);
});

test("portal values override file values without losing classifications", () => {
  const existing = {
    ncs_code: "0101010101_17v2",
    name: "기존",
    level: null,
    definition: null,
    lclas_name: null,
    mclas_name: null,
    sclas_name: null,
    subd_name: null,
  };
  const exact = { name: "CSV", level: "6", definition: "CSV 정의" };
  const hierarchy = {
    lclas_name: "사업관리",
    mclas_name: "사업관리",
    sclas_name: "프로젝트관리",
    subd_name: "공적개발원조사업관리",
  };
  const portal = { name: "포털", level: "7", definition: "포털 정의" };
  const merged = mergeOfficialData(existing, exact, hierarchy, portal, null);

  assert.equal(merged.name, "포털");
  assert.equal(merged.level, "7");
  assert.equal(merged.definition, "포털 정의");
  assert.equal(merged.subd_name, "공적개발원조사업관리");
  assert.deepEqual(changedFields(existing, merged).sort(), [
    "definition",
    "lclas_name",
    "level",
    "mclas_name",
    "name",
    "sclas_name",
    "subd_name",
  ]);
});
