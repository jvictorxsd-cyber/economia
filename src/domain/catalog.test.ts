import { describe, expect, it } from "vitest";
import { filterAndSortItems, paginate } from "./catalog";
import type { PriceItem } from "./types";

const items: PriceItem[] = [
  {
    id: "iron",
    name: "Minério de ferro",
    category: "mining",
    currentPrice: 10,
    plannedPrice: 15,
    unit: "un.",
    icon: "iron",
  },
  {
    id: "carrot",
    name: "Cenoura",
    category: "farming",
    currentPrice: 2,
    plannedPrice: 1,
    unit: "un.",
    icon: "carrot",
  },
  {
    id: "diamond",
    name: "Diamante",
    category: "mining",
    currentPrice: 0,
    plannedPrice: 100,
    unit: "un.",
    icon: "diamond",
  },
];

describe("paginate", () => {
  it("pagina sem perder ou duplicar registros em um conjunto grande", () => {
    const records = Array.from({ length: 10007 }, (_, i) => i);
    const collected: number[] = [];
    const first = paginate(records, 1, 50);
    expect(first.total).toBe(10007);
    expect(first.totalPages).toBe(201);
    for (let page = 1; page <= first.totalPages; page++)
      collected.push(...paginate(records, page, 50).rows);
    expect(collected).toEqual(records);
    expect(paginate(records, 201, 50).rows).toHaveLength(7);
  });

  it("limita a página depois de filtros e mantém tamanho configurável", () => {
    expect(paginate(items, 10, 2)).toMatchObject({
      page: 2,
      totalPages: 2,
      rows: [items[2]],
    });
    expect(paginate(items, 1, 3).rows).toHaveLength(3);
    expect(paginate(items, 0, 2).page).toBe(1);
  });

  it("trata ausência de dados como uma página vazia", () => {
    expect(paginate([], 100, 10)).toEqual({
      page: 1,
      totalPages: 1,
      total: 0,
      rows: [],
    });
  });

  it("normaliza páginas e tamanhos inválidos e fracionários", () => {
    expect(paginate(items, Number.NaN, Number.NaN).rows).toHaveLength(3);
    expect(paginate(items, -1, 0).page).toBe(1);
    expect(paginate(items, 1, -10).rows).toHaveLength(3);
    expect(paginate(items, 1.9, 1.9)).toMatchObject({
      page: 1,
      totalPages: 3,
      rows: [items[0]],
    });
    expect(paginate(items, Number.POSITIVE_INFINITY, 0.5).page).toBe(1);
  });
});

describe("filterAndSortItems", () => {
  it("pesquisa sem acentos e sem distinção entre maiúsculas e minúsculas", () => {
    expect(
      filterAndSortItems(items, "  MINERIO ", "all", "name", "asc").map(
        (i) => i.id,
      ),
    ).toEqual(["iron"]);
    expect(
      filterAndSortItems(items, "diamond", "all", "name", "asc").map(
        (i) => i.id,
      ),
    ).toEqual(["diamond"]);
  });

  it("combina pesquisa e categoria", () => {
    expect(
      filterAndSortItems(items, "", "mining", "name", "asc").map((i) => i.id),
    ).toEqual(["diamond", "iron"]);
    expect(
      filterAndSortItems(items, "cenoura", "mining", "name", "asc"),
    ).toEqual([]);
  });

  it("ordena por preços atuais e planejados em ambas as direções", () => {
    expect(
      filterAndSortItems(items, "", "all", "currentPrice", "asc").map(
        (i) => i.id,
      ),
    ).toEqual(["diamond", "carrot", "iron"]);
    expect(
      filterAndSortItems(items, "", "all", "plannedPrice", "desc").map(
        (i) => i.id,
      ),
    ).toEqual(["diamond", "iron", "carrot"]);
  });

  it("ordena variação percentual e mantém referência zero por último", () => {
    expect(
      filterAndSortItems(items, "", "all", "change", "asc").map((i) => i.id),
    ).toEqual(["carrot", "iron", "diamond"]);
    expect(
      filterAndSortItems(items, "", "all", "change", "desc").map((i) => i.id),
    ).toEqual(["iron", "carrot", "diamond"]);
  });

  it("não modifica o array original e aceita catálogos vazios", () => {
    const original = items.map((i) => i.id);
    filterAndSortItems(items, "", "all", "plannedPrice", "desc");
    expect(items.map((i) => i.id)).toEqual(original);
    expect(filterAndSortItems([], "x", "all", "name", "asc")).toEqual([]);
  });

  it("página filtrada contém somente registros visíveis e respeita o total", () => {
    const filtered = filterAndSortItems(
      items,
      "",
      "mining",
      "plannedPrice",
      "desc",
    );
    const page = paginate(filtered, 2, 1);
    expect(page).toMatchObject({ total: 2, totalPages: 2, page: 2 });
    expect(page.rows.map((i) => i.id)).toEqual(["iron"]);
  });
});
