import type {
  NcsGatewayError,
  NcsListResponse,
  NcsRelatedInfoResponse,
  QualificationListResponse,
} from "./types";

const HRDKAPI_BASE = "https://apis.data.go.kr/B490007/hrdkapi";
const NCS_CL_CD_JM_BASE = "https://apis.data.go.kr/B490007/ncsClCdJm";
const NCS1INFO_BASE = "https://c.q-net.or.kr/openapi/Ncs1info/ncsinfo.do";

function serviceKey(): string {
  const key = process.env.NCS_API_SERVICE_KEY;
  if (!key) throw new Error("NCS_API_SERVICE_KEY is not set (see .env.local.example)");
  return key;
}

function isGatewayError(json: unknown): json is NcsGatewayError {
  return typeof json === "object" && json !== null && "OpenAPI_ServiceResponse" in json;
}

function assertNoError(json: { header?: { resultCode: string; resultMsg: string } }) {
  if (isGatewayError(json)) {
    const { errMsg, returnAuthMsg, returnReasonCode } = json.OpenAPI_ServiceResponse.cmmMsgHeader;
    throw new Error(`NCS API gateway error [${returnReasonCode}] ${errMsg}: ${returnAuthMsg}`);
  }
  if (json.header && json.header.resultCode !== "00") {
    throw new Error(`NCS API error [${json.header.resultCode}] ${json.header.resultMsg}`);
  }
}

// ---------------------------------------------------------------------------
// 1. NCS 관련 정보 서비스 (c.q-net.or.kr) — 2026-08-03 기준 data.go.kr 자체
// "미리보기" 실행으로도 SERVICE ACCESS DENIED ERROR 확인 — 계정/코드 문제가 아니라
// q-net 측 화이트리스트/활성화가 별도로 더 필요한 것으로 확정.
// 파라미터명 자체는 공식 문서로 확인 완료 (ServiceKey는 대문자 S).
// ---------------------------------------------------------------------------
export async function getNcsRelatedInfo(
  params: { type?: "json" | "xml"; pageNo?: number; numOfRows?: number } = {}
): Promise<NcsRelatedInfoResponse> {
  const url = new URL(NCS1INFO_BASE);
  url.searchParams.set("ServiceKey", serviceKey());
  url.searchParams.set("type", params.type ?? "json");
  url.searchParams.set("pageNo", String(params.pageNo ?? 1));
  url.searchParams.set("numOfRows", String(params.numOfRows ?? 10));

  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  assertNoError(json);
  return json as NcsRelatedInfoResponse;
}

// ---------------------------------------------------------------------------
// 2. NCS 능력단위별 자격 종목 조회 서비스 — 2026-08-03 실제 호출로 동작 확인됨.
// 주의: 포맷 파라미터명은 dataFormat 이다 (dataType 아님).
// ---------------------------------------------------------------------------
export async function getQualificationsByCompetencyUnit(
  ncsClCd: string,
  params: { pageNo?: number; numOfRows?: number } = {}
): Promise<QualificationListResponse> {
  const url = new URL(`${NCS_CL_CD_JM_BASE}/getNcsClCdJmList`);
  url.searchParams.set("serviceKey", serviceKey());
  url.searchParams.set("dataFormat", "json");
  url.searchParams.set("ncsClCd", ncsClCd);
  url.searchParams.set("pageNo", String(params.pageNo ?? 1));
  url.searchParams.set("numOfRows", String(params.numOfRows ?? 10));

  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  assertNoError(json);
  return json as QualificationListResponse;
}

// ---------------------------------------------------------------------------
// 3. NCS 기준정보 조회 (hrdkapi, NCS001~007) — 2026-08-03 기준 data.go.kr 자체
// "미리보기" 실행으로도 SERVICETIMEOUT_ERROR(코드 05) 확인 — 한국산업인력공단
// 백엔드 자체 장애가 확실함 (계정/코드 문제 아님).
//
// 요청 파라미터명은 마이페이지 "활용신청 상세기능정보 > 미리보기"에서 실제 확인함:
// 응답 필드명과 동일한 대문자 스네이크케이스를 그대로 사용 (예: NCS_LCLAS_CD).
// NCS001, NCS004는 직접 확인됨. NCS002/003/005/006은 동일 패턴에서 유추,
// NCS007의 키워드 파라미터명은 아직 미확인.
// ---------------------------------------------------------------------------
interface HrdkapiCommonParams {
  pageNo?: number;
  numOfRows?: number;
  NCS_DEGR?: string; // NCS 차수
  USG_YN?: "Y" | "N"; // 최신 차수 여부
}

async function callHrdkapi<T>(
  operation: string,
  params: Record<string, string | number>
): Promise<NcsListResponse<T>> {
  const url = new URL(`${HRDKAPI_BASE}/${operation}`);
  url.searchParams.set("serviceKey", serviceKey());
  url.searchParams.set("dataType", "JSON");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  assertNoError(json);
  return json as NcsListResponse<T>;
}

// 확인됨 (마이페이지 미리보기 실제 파라미터 표)
export function getNcsLargeCategories(params: HrdkapiCommonParams & { NCS_LCLAS_CD?: string } = {}) {
  const { pageNo = 1, numOfRows = 100, ...rest } = params;
  return callHrdkapi("NCS001", { pageNo, numOfRows, ...rest });
}

// 미확인 (같은 패턴에서 유추): 부모 분류코드는 선택 필터로 추정
export function getNcsMediumCategories(params: HrdkapiCommonParams & { NCS_LCLAS_CD?: string } = {}) {
  const { pageNo = 1, numOfRows = 100, ...rest } = params;
  return callHrdkapi("NCS002", { pageNo, numOfRows, ...rest });
}

export function getNcsSmallCategories(params: HrdkapiCommonParams & { NCS_LCLAS_CD?: string; NCS_MCLAS_CD?: string } = {}) {
  const { pageNo = 1, numOfRows = 100, ...rest } = params;
  return callHrdkapi("NCS003", { pageNo, numOfRows, ...rest });
}

// 확인됨
export function getNcsDetailJobs(
  params: HrdkapiCommonParams & { NCS_LCLAS_CD?: string; NCS_MCLAS_CD?: string; NCS_SCLAS_CD?: string; NCS_SUBD_CD?: string } = {}
) {
  const { pageNo = 1, numOfRows = 100, ...rest } = params;
  return callHrdkapi("NCS004", { pageNo, numOfRows, ...rest });
}

// 미확인 (유추)
export function getNcsCompetencyUnits(
  params: HrdkapiCommonParams & { NCS_LCLAS_CD?: string; NCS_MCLAS_CD?: string; NCS_SCLAS_CD?: string; NCS_SUBD_CD?: string } = {}
) {
  const { pageNo = 1, numOfRows = 100, ...rest } = params;
  return callHrdkapi("NCS005", { pageNo, numOfRows, ...rest });
}

export function getNcsCompetencyUnitElements(params: HrdkapiCommonParams & { NCS_COMPE_UNIT_CD?: string; NCS_CL_CD?: string } = {}) {
  const { pageNo = 1, numOfRows = 100, ...rest } = params;
  return callHrdkapi("NCS006", { pageNo, numOfRows, ...rest });
}

// TODO: 키워드 파라미터명 미확인 — 백엔드 복구 후 미리보기로 재확인 필요
export function searchNcsCompetencyUnitsByKeyword(keyword: string, params: HrdkapiCommonParams = {}) {
  const { pageNo = 1, numOfRows = 100, ...rest } = params;
  return callHrdkapi("NCS007", { KEYWORD: keyword, pageNo, numOfRows, ...rest });
}
