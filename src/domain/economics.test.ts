import { describe, expect, it } from "vitest";
import {
  calculateActivity,
  calculatePriceChange,
  projectProfit,
} from "./economics";
import type { Activity, PriceItem, Scenario } from "./types";

const item: PriceItem = {
  id: "iron",
  name: "Ferro",
  category: "mining",
  currentPrice: 8,
  plannedPrice: 10,
  unit: "un.",
  icon: "iron",
};
const scenario: Scenario = {
  id: "likely",
  name: "Provável",
  productivityMultiplier: 1,
  priceMultiplier: 1,
  costMultiplier: 1,
};
const activity: Activity = {
  id: "mine",
  name: "Mina",
  category: "mining",
  itemId: "iron",
  investment: 1000,
  cycleSeconds: 60,
  attemptsPerCycle: 10,
  dropsPerAttempt: 2,
  dropProbability: 0.5,
  efficiency: 0.8,
  productiveFraction: 0.5,
  costPerCycle: 2,
  hourlyCost: 40,
  saleFee: 0.05,
  tool: "Picareta",
  enchants: "Fortuna",
  notes: "Exemplo",
};

describe("calculateActivity", () => {
  it("calcula ciclos produtivos, probabilidade, drops e valor esperado sem arredondamento prematuro", () => {
    const result = calculateActivity(activity, item, scenario);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.cyclesPerHour).toBe(30);
    expect(result.dropsPerCycle).toBe(8);
    expect(result.grossPerCycle).toBe(80);
    expect(result.dropsPerHour).toBe(240);
    expect(result.expectedDropValue).toBe(10);
    expect(result.grossPerHour).toBe(2400);
    expect(result.costPerHour).toBe(220);
    expect(result.netPerHour).toBe(2180);
    expect(result.paybackHours).toBeCloseTo(1000 / 2180);
    expect(result.roiPercent).toBeCloseTo(218);
    expect(result.profit24h).toBe(2180 * 24);
    expect(result.profit7d).toBe(2180 * 168);
    expect(result.profit30d).toBe(2180 * 720);
  });

  it("compara preço atual e planejado mantendo o mesmo modelo de produção e custos", () => {
    const current = calculateActivity(activity, item, scenario, "current");
    const planned = calculateActivity(activity, item, scenario, "planned");
    expect(current.grossPerHour).toBe(1920);
    expect(current.costPerHour).toBe(196);
    expect(planned.netPerHour - current.netPerHour).toBeCloseTo(240 * 2 * 0.95);
  });

  it("atualiza os resultados depois de editar preço e parâmetros", () => {
    const initial = calculateActivity(activity, item, scenario);
    const edited = calculateActivity(
      { ...activity, attemptsPerCycle: 20 },
      { ...item, plannedPrice: 20 },
      scenario,
    );
    expect(edited.grossPerHour).toBe(initial.grossPerHour * 4);
    expect(edited.dropsPerHour).toBe(initial.dropsPerHour * 2);
    expect(edited.netPerHour).toBe(9600 - 100 - 480);
    expect(activity.attemptsPerCycle).toBe(10);
    expect(item.plannedPrice).toBe(10);
  });

  it("aplica cenário a produtividade, preços e custos sem multiplicar a taxa de venda", () => {
    const result = calculateActivity(activity, item, {
      ...scenario,
      productivityMultiplier: 1.5,
      priceMultiplier: 2,
      costMultiplier: 3,
    });
    expect(result.dropsPerHour).toBe(360);
    expect(result.grossPerHour).toBe(7200);
    expect(result.costPerHour).toBe(300 + 360);
    expect(result.netPerHour).toBe(6540);
  });

  it("mantém custos fixos por hora durante inatividade e não cobra custos de ciclos inexistentes", () => {
    const result = calculateActivity(
      { ...activity, productiveFraction: 0 },
      item,
      scenario,
    );
    expect(result.valid).toBe(true);
    expect(result.cyclesPerHour).toBe(0);
    expect(result.dropsPerHour).toBe(0);
    expect(result.dropsPerCycle).toBe(8);
    expect(result.grossPerCycle).toBe(80);
    expect(result.costPerHour).toBe(40);
    expect(result.netPerHour).toBe(-40);
    expect(result.paybackHours).toBeNull();
  });

  it.each([
    "dropProbability",
    "efficiency",
    "attemptsPerCycle",
    "dropsPerAttempt",
  ] as const)("aceita %s igual a zero", (field) => {
    const result = calculateActivity(
      { ...activity, [field]: 0 },
      item,
      scenario,
    );
    expect(result.valid).toBe(true);
    expect(result.dropsPerHour).toBe(0);
    expect(result.grossPerHour).toBe(0);
    expect(result.netPerHour).toBe(-100);
    expect(result.paybackHours).toBeNull();
  });

  it("aceita probabilidade e eficiência de 100%", () => {
    const result = calculateActivity(
      { ...activity, dropProbability: 1, efficiency: 1 },
      item,
      scenario,
    );
    expect(result.dropsPerHour).toBe(600);
    expect(result.valid).toBe(true);
  });

  it("aceita preço zero sem receita e sem divisão por zero", () => {
    const result = calculateActivity(
      activity,
      { ...item, plannedPrice: 0 },
      scenario,
    );
    expect(result.valid).toBe(true);
    expect(result.grossPerHour).toBe(0);
    expect(result.netPerHour).toBe(-100);
    expect(result.paybackHours).toBeNull();
  });

  it("não inventa payback para prejuízo ou lucro nulo", () => {
    for (const hourlyCost of [2220, 4000]) {
      const result = calculateActivity(
        { ...activity, hourlyCost },
        item,
        scenario,
      );
      expect(result.netPerHour).toBeLessThanOrEqual(0);
      expect(result.paybackHours).toBeNull();
      expect(result.roiPercent).toBeLessThanOrEqual(0);
    }
  });

  it("trata investimento zero com payback imediato e ROI indefinido", () => {
    const result = calculateActivity(
      { ...activity, investment: 0 },
      item,
      scenario,
    );
    expect(result.paybackHours).toBe(0);
    expect(result.roiPercent).toBeNull();
  });

  it.each([
    { cycleSeconds: 0 },
    { cycleSeconds: -1 },
    { investment: -1 },
    { costPerCycle: -1 },
    { hourlyCost: -1 },
    { attemptsPerCycle: -1 },
    { dropsPerAttempt: -1 },
    { dropProbability: 1.01 },
    { dropProbability: -0.01 },
    { efficiency: 2 },
    { productiveFraction: -1 },
    { saleFee: 1.1 },
    { cycleSeconds: Number.NaN },
    { hourlyCost: Number.POSITIVE_INFINITY },
  ])("diagnostica entrada inválida %j e não propaga NaN/Infinity", (patch) => {
    const result = calculateActivity({ ...activity, ...patch }, item, scenario);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.grossPerHour).toBe(0);
    expect(result.paybackHours).toBeNull();
    for (const value of Object.values(result))
      if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
  });

  it("diagnostica preço e multiplicadores inválidos", () => {
    expect(
      calculateActivity(activity, { ...item, plannedPrice: -1 }, scenario)
        .valid,
    ).toBe(false);
    expect(
      calculateActivity(activity, item, { ...scenario, costMultiplier: -1 })
        .valid,
    ).toBe(false);
    expect(
      calculateActivity(activity, item, {
        ...scenario,
        priceMultiplier: Number.NaN,
      }).valid,
    ).toBe(false);
    expect(
      calculateActivity(activity, item, {
        ...scenario,
        productivityMultiplier: Number.POSITIVE_INFINITY,
      }).valid,
    ).toBe(false);
  });

  it("diagnostica ausência de dados e vínculo incorreto de item", () => {
    const missingActivity = calculateActivity(undefined, item, scenario);
    expect(missingActivity.valid).toBe(false);
    expect(missingActivity.errors).toEqual([
      "Selecione uma atividade configurada.",
    ]);
    expect(missingActivity.netPerHour).toBe(0);
    expect(missingActivity.paybackHours).toBeNull();
    expect(calculateActivity(activity, undefined, scenario).valid).toBe(false);
    expect(calculateActivity(activity, item, undefined).valid).toBe(false);
    expect(
      calculateActivity(activity, { ...item, id: "gold" }, scenario).valid,
    ).toBe(false);
  });

  it("interrompe resultados que excederiam o limite numérico", () => {
    const result = calculateActivity(
      { ...activity, attemptsPerCycle: Number.MAX_VALUE },
      item,
      scenario,
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("limite numérico");
    expect(result.netPerHour).toBe(0);
  });

  it("mantém totais da tabela iguais à soma das receitas menos os custos", () => {
    const rows = [
      activity,
      { ...activity, id: "mine2", attemptsPerCycle: 20, hourlyCost: 120 },
    ].map((row) => calculateActivity(row, item, scenario));
    const gross = rows.reduce((sum, row) => sum + row.grossPerHour, 0);
    const costs = rows.reduce((sum, row) => sum + row.costPerHour, 0);
    const net = rows.reduce((sum, row) => sum + row.netPerHour, 0);
    expect(net).toBeCloseTo(gross - costs);
    expect(gross).toBe(7200);
    expect(costs).toBe(160 + 120 + 360);
    expect(net).toBe(6560);
  });

  it("calcula pesca com categorias de capturas exclusivas e preços diferentes", () => {
    const treasure: PriceItem = {
      ...item,
      id: "treasure",
      name: "Tesouro",
      currentPrice: 50,
      plannedPrice: 100,
    };
    const catches: Activity = {
      ...activity,
      outputMode: "exclusive",
      outputs: [
        { itemId: "iron", probability: 0.8, dropsPerAttempt: 1 },
        { itemId: "treasure", probability: 0.1, dropsPerAttempt: 1 },
      ],
    };
    const result = calculateActivity(catches, item, scenario, "planned", [
      item,
      treasure,
    ]);
    // 10% sem captura; 240 tentativas efetivas/h; E[valor] = 80%*10 + 10%*100.
    expect(result.valid).toBe(true);
    expect(result.expectedDropValue).toBe(18);
    expect(result.dropsPerHour).toBe(216);
    expect(result.grossPerHour).toBe(4320);
    expect(result.costPerHour).toBe(316);
    expect(result.netPerHour).toBe(4004);
    const current = calculateActivity(catches, item, scenario, "current", [
      item,
      treasure,
    ]);
    expect(current.expectedDropValue).toBeCloseTo(11.4);
    expect(current.grossPerHour).toBeCloseTo(2736);
  });

  it("permite drops independentes de spawners com soma das probabilidades acima de 100%", () => {
    const bone: PriceItem = {
      ...item,
      id: "bone",
      name: "Osso",
      plannedPrice: 5,
    };
    const mobDrops: Activity = {
      ...activity,
      outputMode: "independent",
      outputs: [
        { itemId: "iron", probability: 1, dropsPerAttempt: 2 },
        { itemId: "bone", probability: 0.5, dropsPerAttempt: 3 },
      ],
    };
    const result = calculateActivity(mobDrops, item, scenario, "planned", [
      bone,
    ]);
    expect(result.valid).toBe(true);
    expect(result.expectedDropValue).toBe(27.5);
    expect(result.dropsPerHour).toBe(840);
    expect(result.grossPerHour).toBe(6600);
    expect(result.netPerHour).toBe(6170);
  });

  it("usa drops independentes por padrão e permite resolver o item principal sem catálogo extra", () => {
    const result = calculateActivity(
      {
        ...activity,
        outputs: [
          { itemId: "iron", probability: 1, dropsPerAttempt: 1 },
          { itemId: "iron", probability: 0.5, dropsPerAttempt: 1 },
        ],
      },
      item,
      scenario,
    );
    expect(result.valid).toBe(true);
    expect(result.dropsPerHour).toBe(360);
    expect(result.grossPerHour).toBe(3600);
  });

  it("rejeita probabilidades exclusivas cuja soma ultrapassa 100%", () => {
    const result = calculateActivity(
      {
        ...activity,
        outputMode: "exclusive",
        outputs: [
          { itemId: "iron", probability: 0.7, dropsPerAttempt: 1 },
          { itemId: "iron", probability: 0.5, dropsPerAttempt: 1 },
        ],
      },
      item,
      scenario,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("100%");
  });

  it.each([
    { itemId: "missing", probability: 0.5, dropsPerAttempt: 1 },
    { itemId: "iron", probability: 1.1, dropsPerAttempt: 1 },
    { itemId: "iron", probability: -0.1, dropsPerAttempt: 1 },
    { itemId: "iron", probability: Number.NaN, dropsPerAttempt: 1 },
    { itemId: "iron", probability: 0.5, dropsPerAttempt: -1 },
    {
      itemId: "iron",
      probability: 0.5,
      dropsPerAttempt: Number.POSITIVE_INFINITY,
    },
  ])(
    "diagnostica item ausente e parâmetros inválidos em múltiplos drops: %j",
    (output) => {
      const result = calculateActivity(
        { ...activity, outputs: [output] },
        item,
        scenario,
      );
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.netPerHour).toBe(0);
    },
  );

  it("mantém o modelo simples quando a lista de drops está vazia", () => {
    expect(
      calculateActivity({ ...activity, outputs: [] }, item, scenario),
    ).toEqual(calculateActivity(activity, item, scenario));
  });

  it("preserva o modelo original quando unidades de produção são omitidas ou iguais a um", () => {
    expect(
      calculateActivity({ ...activity, unitsPerCycle: 1 }, item, scenario),
    ).toEqual(calculateActivity(activity, item, scenario));
  });

  it("escala produção pela área plantada ou quantidade de spawners sem multiplicar custos fixos", () => {
    const base = calculateActivity(activity, item, scenario);
    const expanded = calculateActivity(
      { ...activity, unitsPerCycle: 4 },
      item,
      scenario,
    );
    expect(expanded.valid).toBe(true);
    expect(expanded.cyclesPerHour).toBe(base.cyclesPerHour);
    expect(expanded.dropsPerCycle).toBe(base.dropsPerCycle * 4);
    expect(expanded.grossPerCycle).toBe(base.grossPerCycle * 4);
    expect(expanded.dropsPerHour).toBe(base.dropsPerHour * 4);
    expect(expanded.grossPerHour).toBe(base.grossPerHour * 4);
    expect(expanded.costPerHour).toBe(
      100 + expanded.grossPerHour * activity.saleFee,
    );
    expect(expanded.netPerHour).toBe(
      expanded.grossPerHour - expanded.costPerHour,
    );
  });

  it("mantém custos operacionais e receita zero sem unidades de produção", () => {
    const result = calculateActivity(
      { ...activity, unitsPerCycle: 0 },
      item,
      scenario,
    );
    expect(result.valid).toBe(true);
    expect(result.dropsPerHour).toBe(0);
    expect(result.dropsPerCycle).toBe(0);
    expect(result.grossPerCycle).toBe(0);
    expect(result.grossPerHour).toBe(0);
    expect(result.costPerHour).toBe(100);
    expect(result.netPerHour).toBe(-100);
    expect(result.paybackHours).toBeNull();
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejeita quantidade de unidades inválida: %s",
    (unitsPerCycle) => {
      const result = calculateActivity(
        { ...activity, unitsPerCycle },
        item,
        scenario,
      );
      expect(result.valid).toBe(false);
      expect(result.errors.join(" ")).toContain("Unidades de produção");
      expect(result.netPerHour).toBe(0);
    },
  );
});

describe("calculatePriceChange", () => {
  it.each([
    [10, 15, 5, 50],
    [20, 10, -10, -50],
    [10, 10, 0, 0],
    [10, 0, -10, -100],
    [0, 10, 10, null],
    [0, 0, 0, null],
  ])("compara %s → %s", (current, planned, absolute, percent) => {
    expect(calculatePriceChange(current!, planned!)).toEqual({
      absolute,
      percent,
    });
  });

  it.each([
    [Number.NaN, 10],
    [10, Number.POSITIVE_INFINITY],
    [-1, 10],
    [10, -1],
  ])("retorna comparação segura para entrada inválida", (current, planned) => {
    expect(calculatePriceChange(current, planned)).toEqual({
      absolute: 0,
      percent: null,
    });
  });
});

describe("projectProfit", () => {
  const result = calculateActivity(activity, item, scenario);
  it("considera a jornada diária editável e não subtrai investimento duas vezes", () => {
    expect(projectProfit(result, 4, 7)).toBe(2180 * 28);
    expect(projectProfit(result, 24, 30)).toBe(result.profit30d);
  });
  it("preserva prejuízo nas projeções", () => {
    const loss = calculateActivity(
      { ...activity, hourlyCost: 4000 },
      item,
      scenario,
    );
    expect(projectProfit(loss, 4, 7)).toBeLessThan(0);
  });
  it.each([
    [0, 7],
    [4, 0],
    [-1, 7],
    [25, 7],
    [4, -1],
    [Number.NaN, 7],
    [4, Number.POSITIVE_INFINITY],
  ])("trata jornada e períodos inválidos ou zero", (hours, days) => {
    expect(projectProfit(result, hours, days)).toBe(0);
  });
  it("não projeta resultado inválido ou overflow", () => {
    expect(projectProfit({ ...result, valid: false }, 4, 7)).toBe(0);
    expect(
      projectProfit({ ...result, netPerHour: Number.MAX_VALUE }, 24, 30),
    ).toBe(0);
  });
});
