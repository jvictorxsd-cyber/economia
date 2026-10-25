import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoData } from "../data/demo";
import type { AppData } from "../domain/types";
import {
  loadData,
  resetData,
  saveData,
  STORAGE_KEY,
  validateData,
} from "./storage";

const cloneDemo = (): AppData =>
  JSON.parse(JSON.stringify(demoData)) as AppData;

function createStorage() {
  const entries = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => entries.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      entries.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      entries.delete(key);
    }),
  };
}

describe("validação dos dados e importações", () => {
  it("aceita os exemplos e exige um catálogo amplo com IDs únicos", () => {
    expect(validateData(demoData)).toBe(true);
    expect(demoData.items.length).toBeGreaterThanOrEqual(100);
    expect(new Set(demoData.items.map((item) => item.id)).size).toBe(
      demoData.items.length,
    );
    expect(new Set(demoData.items.map((item) => item.category)).size).toBe(5);
    expect(demoData.activities).toHaveLength(12);
  });

  it.each([null, undefined, 0, true, "", [], {}, { items: [] }])(
    "rejeita estrutura incompleta: %j",
    (value) => expect(validateData(value)).toBe(false),
  );

  const invalidCases: [string, (data: AppData) => void][] = [
    [
      "preço negativo",
      (data) => {
        data.items[0].currentPrice = -1;
      },
    ],
    [
      "preço infinito",
      (data) => {
        data.items[0].plannedPrice = Infinity;
      },
    ],
    [
      "preço NaN",
      (data) => {
        data.items[0].plannedPrice = NaN;
      },
    ],
    [
      "montante exagerado",
      (data) => {
        data.items[0].plannedPrice = 1e16;
      },
    ],
    [
      "nome ausente",
      (data) => {
        data.items[0].name = "";
      },
    ],
    [
      "nome com espaços",
      (data) => {
        data.items[0].name = "   ";
      },
    ],
    [
      "ícone ausente",
      (data) => {
        data.items[0].icon = "";
      },
    ],
    [
      "ID de item duplicado",
      (data) => {
        data.items[1].id = data.items[0].id;
      },
    ],
    [
      "ID de atividade duplicado",
      (data) => {
        data.activities[1].id = data.activities[0].id;
      },
    ],
    [
      "ID de cenário duplicado",
      (data) => {
        data.scenarios[1].id = data.scenarios[0].id;
      },
    ],
    [
      "referência de item inexistente",
      (data) => {
        data.activities[0].itemId = "não-existe";
      },
    ],
    [
      "ciclo de duração zero",
      (data) => {
        data.activities[0].cycleSeconds = 0;
      },
    ],
    [
      "duração negativa",
      (data) => {
        data.activities[0].cycleSeconds = -2;
      },
    ],
    [
      "probabilidade acima de 100%",
      (data) => {
        data.activities[0].dropProbability = 1.1;
      },
    ],
    [
      "probabilidade negativa",
      (data) => {
        data.activities[0].dropProbability = -0.1;
      },
    ],
    [
      "eficiência acima de 100%",
      (data) => {
        data.activities[0].efficiency = 1.1;
      },
    ],
    [
      "tempo produtivo acima de 100%",
      (data) => {
        data.activities[0].productiveFraction = 1.1;
      },
    ],
    [
      "taxa de venda acima de 100%",
      (data) => {
        data.activities[0].saleFee = 1.1;
      },
    ],
    [
      "custo de ciclo negativo",
      (data) => {
        data.activities[0].costPerCycle = -1;
      },
    ],
    [
      "custo por hora negativo",
      (data) => {
        data.activities[0].hourlyCost = -1;
      },
    ],
    [
      "investimento negativo",
      (data) => {
        data.activities[0].investment = -1;
      },
    ],
    [
      "média de drops negativa",
      (data) => {
        data.activities[0].dropsPerAttempt = -1;
      },
    ],
    [
      "tentativas negativas",
      (data) => {
        data.activities[0].attemptsPerCycle = -1;
      },
    ],
    [
      "unidades produtivas negativas",
      (data) => {
        data.activities[0].unitsPerCycle = -1;
      },
    ],
    [
      "unidades produtivas infinitas",
      (data) => {
        data.activities[0].unitsPerCycle = Infinity;
      },
    ],
    [
      "multiplicador de preço negativo",
      (data) => {
        data.scenarios[0].priceMultiplier = -1;
      },
    ],
    [
      "multiplicador de custo infinito",
      (data) => {
        data.scenarios[0].costMultiplier = Infinity;
      },
    ],
    [
      "multiplicador produtivo NaN",
      (data) => {
        data.scenarios[0].productivityMultiplier = NaN;
      },
    ],
    [
      "mais de 24 horas por dia",
      (data) => {
        data.settings.hoursPerDay = 25;
      },
    ],
    [
      "horas negativas",
      (data) => {
        data.settings.hoursPerDay = -1;
      },
    ],
    [
      "saldo negativo",
      (data) => {
        data.settings.balance = -1;
      },
    ],
    [
      "patrimônio inválido",
      (data) => {
        data.settings.assets = NaN;
      },
    ],
    [
      "moeda vazia",
      (data) => {
        data.settings.currency = "";
      },
    ],
    [
      "moeda muito longa",
      (data) => {
        data.settings.currency = "C".repeat(17);
      },
    ],
    [
      "cenário selecionado inexistente",
      (data) => {
        data.settings.scenarioId = "inexistente";
      },
    ],
    [
      "sem cenários",
      (data) => {
        data.scenarios = [];
      },
    ],
    [
      "notas excessivas",
      (data) => {
        data.activities[0].notes = "x".repeat(5001);
      },
    ],
  ];

  it.each(invalidCases)("rejeita %s", (_name, mutate) => {
    const data = cloneDemo();
    mutate(data);
    expect(validateData(data)).toBe(false);
  });

  it("rejeita tipos incorretos e categorias desconhecidas em dados externos", () => {
    const data = cloneDemo();
    const external = data as unknown as { items: Record<string, unknown>[] };
    external.items[0].category = "inventada";
    expect(validateData(data)).toBe(false);
    external.items[0].category = "mining";
    external.items[0].currentPrice = "240";
    expect(validateData(data)).toBe(false);
  });

  it("aceita ausência de itens e atividades com configurações e cenário válidos", () => {
    const data = cloneDemo();
    data.items = [];
    data.activities = [];
    expect(validateData(data)).toBe(true);
    data.activities = [demoData.activities[0]];
    expect(validateData(data)).toBe(false);
  });

  it("aceita zeros, probabilidades extremas e custos superiores à receita", () => {
    const data = cloneDemo();
    data.items[0].currentPrice = 0;
    data.items[0].plannedPrice = 0;
    Object.assign(data.activities[0], {
      investment: 0,
      dropProbability: 0,
      efficiency: 1,
      productiveFraction: 0,
      saleFee: 1,
      hourlyCost: 10000,
      costPerCycle: 0,
      attemptsPerCycle: 0,
      dropsPerAttempt: 0,
      tool: "",
      enchants: "",
      notes: "",
    });
    data.settings.hoursPerDay = 0;
    data.settings.balance = 0;
    data.settings.assets = 0;
    data.scenarios[0].productivityMultiplier = 0;
    expect(validateData(data)).toBe(true);
    data.settings.hoursPerDay = 24;
    data.activities[0].dropProbability = 1;
    expect(validateData(data)).toBe(true);
  });

  it("rejeita tamanhos excessivos antes de processar cada entrada", () => {
    const data = cloneDemo();
    data.items = Array.from({ length: 50001 }, () => demoData.items[0]);
    expect(validateData(data)).toBe(false);
    data.items = demoData.items;
    data.activities = Array.from(
      { length: 10001 },
      () => demoData.activities[0],
    );
    expect(validateData(data)).toBe(false);
    data.activities = demoData.activities;
    data.scenarios = Array.from({ length: 101 }, () => demoData.scenarios[0]);
    expect(validateData(data)).toBe(false);
  });

  it("aceita drops independentes, categorias exclusivas e fallback sem drops adicionais", () => {
    const data = cloneDemo();
    const activity = data.activities[0];
    activity.outputs = [
      { itemId: "diamond", probability: 1, dropsPerAttempt: 2 },
      { itemId: "iron-ingot", probability: 1, dropsPerAttempt: 1 },
    ];
    activity.outputMode = "independent";
    expect(validateData(data)).toBe(true);
    activity.outputMode = "exclusive";
    expect(validateData(data)).toBe(false);
    activity.outputs[0].probability = 0.4;
    activity.outputs[1].probability = 0.6;
    expect(validateData(data)).toBe(true);
    activity.outputs = [];
    expect(validateData(data)).toBe(true);
    delete activity.outputMode;
    delete activity.outputs;
    expect(validateData(data)).toBe(true);
  });

  it("aceita unidades produtivas opcionais e zero para atividades interrompidas", () => {
    const data = cloneDemo();
    delete data.activities[0].unitsPerCycle;
    expect(validateData(data)).toBe(true);
    data.activities[0].unitsPerCycle = 0;
    expect(validateData(data)).toBe(true);
    data.activities[0].unitsPerCycle = 64;
    expect(validateData(data)).toBe(true);
  });

  it("rejeita drops com referências, probabilidades, quantidades ou modos inválidos", () => {
    const data = cloneDemo();
    const activity = data.activities[0];
    activity.outputs = [
      { itemId: "não-existe", probability: 0.5, dropsPerAttempt: 1 },
    ];
    expect(validateData(data)).toBe(false);
    activity.outputs[0].itemId = "diamond";
    activity.outputs[0].probability = -1;
    expect(validateData(data)).toBe(false);
    activity.outputs[0].probability = 2;
    expect(validateData(data)).toBe(false);
    activity.outputs[0].probability = 0.5;
    activity.outputs[0].dropsPerAttempt = -1;
    expect(validateData(data)).toBe(false);
    activity.outputs[0].dropsPerAttempt = 1;
    (activity as unknown as Record<string, unknown>).outputMode = "inválido";
    expect(validateData(data)).toBe(false);
    delete activity.outputMode;
    (activity as unknown as Record<string, unknown>).outputs = {};
    expect(validateData(data)).toBe(false);
    activity.outputs = Array.from({ length: 101 }, () => ({
      itemId: "diamond",
      probability: 0.001,
      dropsPerAttempt: 1,
    }));
    expect(validateData(data)).toBe(false);
  });
});

describe("persistência local versionada", () => {
  let storage: ReturnType<typeof createStorage>;
  beforeEach(() => {
    storage = createStorage();
    vi.stubGlobal("localStorage", storage);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("retorna cópias independentes dos exemplos quando não há dados salvos", () => {
    const first = loadData();
    expect(first).toEqual(demoData);
    first.items[0].name = "Alteração local";
    expect(loadData().items[0].name).toBe("Diamante");
    expect(demoData.items[0].name).toBe("Diamante");
  });

  it("salva o envelope versionado e restaura preços e parâmetros editados", () => {
    const data = cloneDemo();
    data.items[0].plannedPrice = 500;
    data.activities[0].investment = 30000;
    data.settings.hoursPerDay = 8;
    expect(saveData(data)).toBe(true);
    const envelope = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(envelope.version).toBe(1);
    expect(envelope.data).toEqual(data);
    expect(loadData()).toEqual(data);
  });

  it.each([
    "{inválido",
    "null",
    "[]",
    "{}",
    JSON.stringify({ version: 999, data: demoData }),
    JSON.stringify({ version: 1, data: { items: [] } }),
    JSON.stringify(demoData),
  ])(
    "restaura exemplos após dado ausente, corrompido ou incompatível: caso %#",
    (raw) => {
      storage.setItem(STORAGE_KEY, raw);
      expect(loadData()).toEqual(demoData);
    },
  );

  it("não sobrescreve dados existentes com uma tentativa de salvamento inválida", () => {
    expect(saveData(demoData)).toBe(true);
    const prior = storage.getItem(STORAGE_KEY);
    const invalid = cloneDemo();
    invalid.activities[0].dropProbability = 2;
    expect(saveData(invalid)).toBe(false);
    expect(storage.getItem(STORAGE_KEY)).toBe(prior);
  });

  it("persiste um catálogo vazio válido sem reintroduzir os exemplos", () => {
    const data = cloneDemo();
    data.items = [];
    data.activities = [];
    expect(saveData(data)).toBe(true);
    expect(loadData().items).toEqual([]);
    expect(loadData().activities).toEqual([]);
  });

  it("tolera acesso bloqueado e informa falha de salvamento", () => {
    storage.getItem.mockImplementation(() => {
      throw new Error("Bloqueado");
    });
    storage.setItem.mockImplementation(() => {
      throw new Error("Quota");
    });
    storage.removeItem.mockImplementation(() => {
      throw new Error("Bloqueado");
    });
    expect(loadData()).toEqual(demoData);
    expect(saveData(demoData)).toBe(false);
    expect(resetData()).toEqual(demoData);
  });

  it("funciona sem objeto localStorage, como em renderização no servidor", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(loadData()).toEqual(demoData);
    expect(saveData(demoData)).toBe(false);
    expect(resetData()).toEqual(demoData);
  });

  it("restaura apenas os próprios dados e retorna uma cópia independente", () => {
    storage.setItem("outro-aplicativo", "preservar");
    saveData(demoData);
    const reset = resetData();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.getItem("outro-aplicativo")).toBe("preservar");
    expect(reset).toEqual(demoData);
    reset.items[0].plannedPrice = 0;
    expect(demoData.items[0].plannedPrice).not.toBe(0);
  });
});
