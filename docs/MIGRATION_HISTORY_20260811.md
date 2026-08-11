# Supabase 마이그레이션 이력 정합화 — 2026-08-11

## 대상과 원칙

- Supabase project ref: `yobjuffwfklzpmeriiwz`
- 운영 스키마 SQL은 다시 실행하지 않았다.
- 원격 객체가 이미 존재하는지 읽기 전용 SQL로 확인한 뒤 `supabase migration repair --status applied`로 이력 행만 추가했다.
- 실제 키, DB 비밀번호, CLI 단기 자격증명은 이 문서와 Git에 기록하지 않았다.

## 발견한 원인

로컬 파일은 `00000000000001`~`00000000000012`라는 인위적 순번을 사용했지만, 원격 migration history는 실제 적용 시각인 `202608...` 버전을 사용했다. 따라서 00004·00005만 누락된 것이 아니라 모든 기존 파일의 버전이 원격과 달랐다.

원격에는 `seed_first_platform_admin`이 있었지만 로컬 파일은 없었다. 반대로 로컬의 `platform_admin_global_access`와 `company_context_job_design`은 운영 DB에 적용돼 있으나 원격 history에만 없었다.

## 최종 대응표

| 이전 로컬 버전 | 최종/원격 버전 | 이름 | 처리 |
|---|---:|---|---|
| 00001 | 20260803115104 | init_schema | 파일명 정렬 |
| 00002 | 20260803124754 | platform_admin_invites | 파일명 정렬 |
| 00003 | 20260803124852 | lockdown_admin_functions | 파일명 정렬 |
| 없음 | 20260803125931 | seed_first_platform_admin | 안전한 no-op 이력 파일 복원 |
| 00004 | 20260804093011 | platform_admin_global_access | 객체 검증 후 history만 applied 처리 |
| 00005 | 20260804093012 | company_context_job_design | 객체 검증 후 history만 applied 처리 |
| 00006 | 20260805014648 | ai_generation_rate_limit | 파일명 정렬 |
| 00007 | 20260808011147 | organization_access_requests | 파일명 정렬 |
| 00008 | 20260808013629 | organization_member_status | 파일명 정렬 |
| 00009 | 20260808014011 | member_self_visibility | 파일명 정렬 |
| 00010 | 20260808014048 | held_org_visibility | 파일명 정렬 |
| 00011 | 20260811011554 | fix_admin_listing_email_cast | 파일명 정렬 |
| 00012 | 20260811045817 | admin_write_member_readonly | 파일명 정렬 |

`20260804093011`과 `20260804093012`는 두 파일이 저장소에 처음 추가된 Git 커밋 시각을 UTC로 변환해, 앞뒤 원격 버전 사이에 순서대로 배치한 값이다.

## 00004·00005 적용 증거

원격 DB에서 다음을 직접 확인했다.

- `is_org_member(uuid)`와 `is_org_admin(uuid)`가 플랫폼 관리자를 포함하고, `authenticated`만 실행할 수 있으며 `anon`은 실행할 수 없음
- `organization_sources`, `organization_profiles`, `role_ncs_mappings`, `jd_validation_runs` 테이블 존재
- `jd_versions`의 `version_major`, `version_minor`, `organization_profile_id`, `design_snapshot`, `revision_kind` 컬럼 존재
- `company-sources` Storage 버킷 존재
- 위 테이블 및 `storage.objects`에 후속 권한 분리 migration까지 반영된 RLS 정책 존재
- `ai_generation_events`와 이후 00007~00012 객체도 정상 존재

## 수행한 이력 변경

```text
supabase migration repair 20260804093011 20260804093012 --status applied --linked
```

이 명령은 00004·00005의 SQL 본문을 실행하지 않고 `supabase_migrations.schema_migrations` 이력만 추가했다.

## 최종 검증

- `supabase migration list --linked`: 로컬/원격 13개 버전이 모두 1:1 일치
- 새 원격 이력 이름: `platform_admin_global_access`, `company_context_job_design`
- `supabase db push --linked --dry-run`: `Remote database is up to date`, migrations `[]`

향후 마이그레이션 파일은 반드시 `supabase migration new <name>`이 생성하는 실제 타임스탬프 버전을 유지한다. 임의의 `000...` 순번으로 다시 바꾸지 않는다.
