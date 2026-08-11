import { describe, expect, it, vi } from "vitest";
import { collectAllPages } from "./paginate";

function pagedSource(total: number) {
  const items = Array.from({ length: total }, (_, index) => index);
  return vi.fn(async (page: number, perPage: number) => items.slice((page - 1) * perPage, page * perPage));
}

describe("collectAllPages", () => {
  it("returns every item when the total spans multiple pages", async () => {
    const fetchPage = pagedSource(250);
    await expect(collectAllPages(fetchPage, 100)).resolves.toHaveLength(250);
    // 100 + 100 + 50 → 세 번째 응답이 perPage보다 적으므로 거기서 멈춘다
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("stops after one request when the first page is not full", async () => {
    const fetchPage = pagedSource(8);
    await expect(collectAllPages(fetchPage, 100)).resolves.toHaveLength(8);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("makes one extra request when the total is an exact multiple of perPage", async () => {
    const fetchPage = pagedSource(200);
    await expect(collectAllPages(fetchPage, 100)).resolves.toHaveLength(200);
    // 두 번째 페이지가 가득 찼으므로 빈 세 번째 페이지를 확인해야 끝난 걸 알 수 있다
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("handles an empty source", async () => {
    await expect(collectAllPages(pagedSource(0), 100)).resolves.toEqual([]);
  });

  it("throws instead of silently truncating when the page cap is hit", async () => {
    const fetchPage = pagedSource(10_000);
    await expect(collectAllPages(fetchPage, 100, 3)).rejects.toThrow(/목록이 너무 큽니다/);
  });
});
