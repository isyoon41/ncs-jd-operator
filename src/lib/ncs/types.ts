// 공공데이터포털 "한국산업인력공단_NCS 기준정보 조회" (apis.data.go.kr/B490007/hrdkapi)
// Swagger 응답 스키마에서 그대로 추출한 필드 (2026-08-03 기준, response schema만 존재하고
// 요청 파라미터는 문서에 없음 — README의 "TODO: 요청 파라미터 확인" 참고)

export interface Ncs001Item {
  NCS_DEGR: string; // NCS 차수
  USG_YN: string; // 최신 차수 여부
  NCS_LCLAS_CD: string; // NCS 대분류코드
  NCS_LCLAS_CDNM: string; // NCS 대분류코드명
}

export interface Ncs002Item {
  USG_YN: string;
  NCS_LCLAS_CD: string;
  NCS_LCLAS_CDNM: string;
  NCS_MCLAS_CD: string; // NCS 중분류코드
  NCS_MCLAS_CDNM: string; // NCS 중분류코드명
  NCS_DEGR: string;
}

export interface Ncs003Item {
  NCS_LCLAS_CD: string;
  NCS_LCLAS_CDNM: string;
  NCS_MCLAS_CD: string;
  NCS_MCLAS_CDNM: string;
  NCS_SCLAS_CD: string; // NCS 소분류코드
  NCS_SCLAS_CDNM: string; // NCS 소분류코드명
  NCS_DEGR: string;
  USG_YN: string;
}

export interface Ncs004Item {
  USG_YN: string;
  NCS_LCLAS_CD: string;
  NCS_LCLAS_CDNM: string;
  NCS_MCLAS_CD: string;
  NCS_MCLAS_CDNM: string;
  NCS_SCLAS_CD: string;
  NCS_SCLAS_CDNM: string;
  NCS_SUBD_CD: string; // NCS 세분류(직무)코드
  NCS_SUBD_CDNM: string; // NCS 세분류코드명
  NCS_DEGR: string;
  DUTY_DEF: string; // 직무 정의 — JD 미션/직무개요에 바로 활용 가능
  DUTY_ORD: string; // 직무 순서
}

export interface Ncs005Item {
  NCS_LCLAS_CD: string;
  NCS_LCLAS_CDNM: string;
  NCS_MCLAS_CD: string;
  NCS_MCLAS_CDNM: string;
  NCS_SCLAS_CD: string;
  NCS_SCLAS_CDNM: string;
  NCS_SUBD_CD: string;
  NCS_SUBD_CDNM: string;
  NCS_DEGR: string;
  USG_YN: string;
  NCS_COMPE_UNIT_CD: string; // NCS 능력단위 코드
  DEVEL_YY: string; // 개발년도
  VER_NO: string; // 버전번호
  NCS_CL_CD: string; // NCS 분류코드 (능력단위코드_버전 형태로 추정, 예: 1402030405_15v1)
  COMPE_UNIT_NAME: string; // 능력단위명
  COMPE_UNIT_DEF: string; // 능력단위정의 — JD 책임/과업 문장의 근거 텍스트로 활용
  COMPE_UNIT_LEVEL: string; // 능력단위 수준 (1~8)
}

export interface Ncs006Item {
  NCS_DEGR: string;
  NCS_CL_CD: string;
  COMPE_UNIT_NAME: string;
  COMPE_UNIT_DEF: string;
  COMPE_UNIT_FACTR_NO_CD: string; // 능력단위요소 번호코드
  COMPE_UNIT_FACTR_NO: string; // 능력단위요소 번호
  COMPE_UNIT_FACTR_NAME: string; // 능력단위요소명 — JD 핵심 과업 문장 소스
  COMPE_UNIT_FACTR_LEVEL: string; // 능력단위요소 수준
  USG_YN: string;
}

export interface Ncs007Item {
  USG_YN: string;
  RN: string; // 항목번호
  TOT_CNT: string; // 검색 결과 개수
  NCS_LCLAS_CD: string;
  NCS_LCLAS_CDNM: string;
  NCS_MCLAS_CD: string;
  NCS_MCLAS_CDNM: string;
  NCS_SCLAS_CD: string;
  NCS_SCLAS_CDNM: string;
  NCS_SUBD_CD: string;
  NCS_SUBD_CDNM: string;
  DUTY_DEF: string;
  DUTY_ORD: string;
  NCS_DEGR: string;
  NCS_COMPE_UNIT_CD: string;
  DEVEL_YY: string;
  VER_NO: string;
  NCS_CL_CD: string;
  COMPE_UNIT_NAME: string;
  COMPE_UNIT_DEF: string;
  COMPE_UNIT_LEVEL: string;
  COMPE_UNIT_FACTR_NO_CD: string;
  COMPE_UNIT_FACTR_NO: string;
  COMPE_UNIT_FACTR_NAME: string;
  COMPE_UNIT_FACTR_LEVEL: string;
}

export interface NcsListResponse<T> {
  header: { resultCode: string; resultMsg: string };
  body?: {
    items?: { item: T[] | T };
    pageNo: string;
    numOfRows: string;
    totalCount: string;
    lastPageNo: string;
  };
}

// hrdkapi 게이트웨이 자체 오류 포맷 (백엔드 미응답 시 이 형태로 옴)
export interface NcsGatewayError {
  OpenAPI_ServiceResponse: {
    cmmMsgHeader: {
      errMsg: string;
      returnAuthMsg: string;
      returnReasonCode: string;
    };
  };
}

// ---------------------------------------------------------------------------
// 2. 한국산업인력공단_NCS 능력단위별 자격 종목 조회 서비스 (ncsClCdJm/getNcsClCdJmList)
// 공식 참고문서([한국산업인력공단]NCS 능력단위별 자격 종목 조회.docx)에서 확인, 2026-08-03 실제 호출로 검증됨.
// 응답 포맷이 hrdkapi와 다름: body.items 가 배열을 바로 담음 (item 래퍼 없음).
// ---------------------------------------------------------------------------
export interface QualificationItem {
  jmCd: string; // 종목코드
  jmNm: string; // 종목명
  organStdVerCd: string; // 기준버전
  eduTrngStdTmSum: number; // 교육훈련 기준시간 합계
  jobBasisAbltStdTm: number; // 직업기초훈련 기준시간
  mandAbltUnitStdTm: number; // 필수능력단위 기준시간
  selAbltUnitStdTm: number; // 선택능력단위 기준시간
  examInstiNm: string; // 시험기관명
  ncsClCd: string; // NCS 능력단위코드 (예: 1501020207_14v2)
  compeUnitName: string; // 능력단위명
  abltUnitTypCd: string; // 능력단위 유형코드 (MAND | SEL)
  abltUnitTypNm: string; // 능력단위 유형명 (필수 | 선택) — 자격요건 섹션에 활용
  minEduTrngTm: number; // 능력단위 최소훈련시간
}

export interface QualificationListResponse {
  header: { resultCode: string; resultMsg: string };
  body: {
    items: QualificationItem[];
    numOfRows: number;
    pageNo: number;
    totalCount: number;
  };
}

// ---------------------------------------------------------------------------
// 1. 한국산업인력공단_NCS 관련 정보 서비스 (c.q-net.or.kr/openapi/Ncs1info/ncsinfo.do)
// 공식 참고문서(OPEN-API_과정평가형일학습병행 NCS 관련정보.docx)에서 확인.
// 2026-08-03 기준 SERVICE_ACCESS_DENIED_ERROR로 미검증 — q-net 측 별도 승인/화이트리스트 필요 가능성.
// 응답 포맷이 위 두 서비스와도 다름: body.root.info / body.root.items.ncsInfo
// ---------------------------------------------------------------------------
export interface NcsRelatedInfoItem {
  ncsClCd: string; // 능력단위코드
  compeUnitName: string; // 능력단위명
  compeUnitLevel: string; // 능력단위수준 (1~8)
  ncsLclasCdnm: string; // 대분류명
  ncsMclasCdnm: string; // 중분류명
  ncsSclasCdnm: string; // 소분류명
  ncsSubdCdnm: string; // 세분류명
  compeUnitDef: string; // 능력단위정의 — JD 미션/책임 서술문 근거 텍스트
}

export interface NcsRelatedInfoResponse {
  header: { resultCode: string; resultMsg: string };
  body: {
    root: {
      info: { totalCount: number; pageNo: number; numOfRows: number };
      items: { ncsInfo: NcsRelatedInfoItem[] | NcsRelatedInfoItem };
    };
  };
}
