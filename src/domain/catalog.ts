import { calculatePriceChange } from "./economics";
import type { Category, PriceItem } from "./types";

export { categoryLabels } from "./types";

export function paginate<T>(
  records: readonly T[],
  page: number,
  pageSize: number,
): {
  rows: T[];
  page: number;
  totalPages: number;
  total: number;
} {
  const size =
    Number.isFinite(pageSize) && pageSize > 0
      ? Math.max(1, Math.floor(pageSize))
      : 10;
  const totalPages = Math.max(1, Math.ceil(records.length / size));
  const current = Math.min(
    totalPages,
    Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1),
  );
  return {
    rows: records.slice((current - 1) * size, current * size),
    page: current,
    totalPages,
    total: records.length,
  };
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

export function filterAndSortItems(
  items: readonly PriceItem[],
  query: string,
  category: "all" | Category,
  sort: "name" | "currentPrice" | "plannedPrice" | "change",
  direction: "asc" | "desc",
): PriceItem[] {
  const needle = normalize(query.trim());
  const filtered = items.filter(
    (item) =>
      (category === "all" || item.category === category) &&
      (!needle || normalize(`${item.name} ${item.id}`).includes(needle)),
  );
  const sign = direction === "asc" ? 1 : -1;
  return filtered.sort((a, b) => {
    if (sort === "name") return sign * a.name.localeCompare(b.name, "pt-BR");
    const av =
      sort === "change"
        ? calculatePriceChange(a.currentPrice, a.plannedPrice).percent
        : a[sort];
    const bv =
      sort === "change"
        ? calculatePriceChange(b.currentPrice, b.plannedPrice).percent
        : b[sort];
    // Undefined changes and invalid values always appear last, independent of direction.
    const aValid = av !== null && Number.isFinite(av);
    const bValid = bv !== null && Number.isFinite(bv);
    if (!aValid && !bValid) return a.name.localeCompare(b.name, "pt-BR");
    if (!aValid) return 1;
    if (!bValid) return -1;
    return (
      sign * ((av as number) - (bv as number)) ||
      a.name.localeCompare(b.name, "pt-BR")
    );
  });
}
