# NCS 정의 데이터 동기화

`ncs_competency_units`의 능력단위 정의와 분류 계층을 공식 데이터로 보강하는 운영 절차다.

## 공식 원천

- 공공데이터포털 `한국산업인력공단_직무능력은행 NCS분류별 계좌 통계 정보_20250914`
  - 상세: <https://www.data.go.kr/data/15151089/fileData.do>
  - 능력단위 코드·명칭·정의·수준·분류 계층을 제공한다.
- NCS 국가직무능력표준 포털 상세조회
  - <https://www.ncs.go.kr/>
  - CSV에 없는 코드의 정확한 능력단위 정의와 분류 경로를 보완한다.

공공데이터포털 `NCS 기준정보 조회` API는 공식 기능이지만 2026-08-11 기준 기관 백엔드가
`SERVICETIMEOUT_ERROR`를 반환했다. 새 `공통 NCS 정보` API는 별도 활용신청이 필요해,
현재는 다운로드 파일과 공식 포털 상세조회 조합을 사용한다.

## 준비

`.env.local`에 아래 값이 있어야 한다. 실제 키는 문서나 커밋에 넣지 않는다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 실행

스크립트는 기본적으로 dry-run이다. 기존 DB에 있는 `ncs_code`만 갱신하며 새 코드는 삽입하지 않는다.

```powershell
# 공식 CSV를 자동 다운로드하고 변경 예상치만 확인
npm.cmd run sync:ncs-details -- --download-source --portal

# 앞 5개만 운영 DB에 반영해 소량 검증
npm.cmd run sync:ncs-details -- --download-source --portal --limit 5 --apply

# 전체 운영 DB 반영
npm.cmd run sync:ncs-details -- --download-source --portal --apply
```

포털 응답은 기본적으로 Windows 임시 폴더의
`ncs-jd-official-details-cache.json`에 저장된다. 중단 후 같은 명령을 다시 실행하면 성공한 응답을
재사용한다. `--refresh-portal`을 지정하면 캐시와 DB에 값이 있어도 다시 조회한다.

일부 조회 실패가 있으면 `--apply` 모드에서 DB 반영 전 중단한다. 실패 원인을 확인하고 재실행하는 것이
원칙이며, 의도적으로 부분 반영할 때만 `--allow-partial`을 사용한다.

## 검증

동기화 전후 아래 항목을 확인한다.

1. 전체 행 수가 변하지 않았는지
2. `definition is not null` 행 수가 증가했는지
3. 네 분류명(`lclas_name`~`subd_name`)이 모두 채워진 행 수가 증가했는지
4. 실제 회사 소개의 검색어가 능력단위명에는 없고 정의에만 있을 때 후보로 검색되는지
5. 비밀값이 로그와 git diff에 포함되지 않았는지

## 2026-08-11 운영 반영 결과

- 기존 행 수: 13,442개 (반영 전후 동일)
- 공식 능력단위 정의: 13,398개, 99.67%
- 대·중·소·세분류명이 모두 있는 행: 13,442개, 100%
- 정의가 없는 44개는 전부 19번 대분류의 과거 전자기기 개발 코드다. 공식 CSV에는 정확히 같은
  버전이 없고 NCS 포털도 `defInfo`를 반환하지 않았다.

정확도를 위해 동일 명칭의 다른 버전 정의를 임의 복사하지 않았다. 공식 원천에서 해당 버전 정의가
제공되면 `--refresh-portal` 또는 갱신된 CSV로 다시 동기화한다.
