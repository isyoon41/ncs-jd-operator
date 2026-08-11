// Supabase Admin API는 페이지 단위로만 응답한다. 한 페이지만 읽으면 그 뒤 사용자는
// 오류 없이 조용히 사라지므로, 마지막 페이지까지 끝까지 읽어야 한다.
export const ADMIN_PAGE_SIZE = 1000;

// 무한 루프 방지용 상한. 여기에 걸리면 조용히 자르지 말고 반드시 예외를 던진다 —
// 목록이 잘린 채 "정상"으로 보이는 것이 이 함수가 막으려는 바로 그 문제다.
export const MAX_PAGES = 50;

export async function collectAllPages<T>(
  fetchPage: (page: number, perPage: number) => Promise<T[]>,
  perPage: number = ADMIN_PAGE_SIZE,
  maxPages: number = MAX_PAGES,
): Promise<T[]> {
  const collected: T[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const batch = await fetchPage(page, perPage);
    collected.push(...batch);
    // 요청한 개수보다 적게 왔다면 마지막 페이지다.
    if (batch.length < perPage) return collected;
  }

  throw new Error(
    `목록이 너무 큽니다 (${maxPages}페이지 × ${perPage}건 초과). 조회 방식을 페이지네이션 UI로 바꿔야 합니다.`,
  );
}
