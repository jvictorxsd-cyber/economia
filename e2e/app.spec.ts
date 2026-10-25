import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { demoData } from "../src/data/demo";

const storageKey = "economia.minecraft.v1";
const money = (n: number) =>
  `C$ ${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;

async function navigate(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "Abrir menu", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("button", { name: new RegExp(`^${name}(?: \\d+)?$`) })
    .click();
}

function card(page: Page, label: string) {
  return page
    .locator(".stat-card")
    .filter({ has: page.getByText(label, { exact: true }) });
}

async function readCSV(page: Page, buttonName: string) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: buttonName, exact: true }).click();
  const download = await pending;
  const path = await download.path();
  expect(path).not.toBeNull();
  return { download, contents: await readFile(path!, "utf8") };
}

test("navegação completa e layout responsivo sem overflow do documento", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `/tmp/blockonomics-${testInfo.project.name}-dashboard.png`,
    fullPage: true,
  });
  const pages = [
    ["Tabela de preços", "Catálogo de preços"],
    ["Comparador de preços", "Comparador de preços"],
    ["Mineração", "Mineração"],
    ["Plantações", "Plantações"],
    ["Pesca", "Pesca"],
    ["Spawners", "Spawners"],
    ["Outras atividades", "Outras atividades"],
    ["Investimentos", "Investimentos"],
    ["Cenários", "Cenários"],
    ["Relatórios", "Relatórios"],
    ["Configurações", "Configurações"],
  ];
  for (const [nav, heading] of pages) {
    await navigate(page, nav);
    await expect(
      page.getByRole("heading", { name: heading, exact: true, level: 1 }),
    ).toBeVisible();
    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(viewport.document, `Overflow em ${nav}`).toBeLessThanOrEqual(
      viewport.width + 1,
    );
  }
  expect(errors).toEqual([]);
});

test("pesquisa, filtros, paginação e totais consideram todo o conjunto filtrado", async ({
  page,
}) => {
  await page.goto("/#prices");
  const rows = page.locator(".price-table tbody tr");
  await expect(rows).toHaveCount(10);
  await expect(
    page.getByText("1–10 de 129 registros", { exact: true }),
  ).toBeVisible();
  const totals = await page.locator(".price-table tfoot").innerText();
  const firstItem = await rows.first().innerText();
  await page
    .getByRole("button", { name: "Próxima página", exact: true })
    .click();
  await expect(
    page.getByText("11–20 de 129 registros", { exact: true }),
  ).toBeVisible();
  expect(await rows.first().innerText()).not.toBe(firstItem);
  expect(await page.locator(".price-table tfoot").innerText()).toBe(totals);
  await page
    .getByLabel("Registros por página", { exact: true })
    .selectOption("50");
  await expect(rows).toHaveCount(50);
  await page.getByLabel("Categoria", { exact: true }).selectOption("mining");
  await expect(rows).toHaveCount(30);
  await page
    .getByRole("textbox", { name: "Buscar item", exact: true })
    .fill("diamante");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Diamante");
  await page
    .getByRole("textbox", { name: "Buscar item", exact: true })
    .fill("recurso inexistente");
  await expect(rows).toHaveCount(0);
  await expect(
    page.getByText("Nenhum resultado encontrado. Tente outros filtros.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("0 de 0 registros", { exact: true }),
  ).toBeVisible();
});

test("preço editado persiste e atualiza simulador, dashboard e CSV", async ({
  page,
}) => {
  await page.goto("/#prices");
  await page
    .getByRole("textbox", { name: "Buscar item", exact: true })
    .fill("diamante");
  await page
    .getByRole("spinbutton", {
      name: "Preço planejado de Diamante",
      exact: true,
    })
    .fill("1000000");
  await expect(page.locator(".price-table tbody tr")).toContainText(
    "416.566,7%",
  );
  await page.reload();
  await page
    .getByRole("textbox", { name: "Buscar item", exact: true })
    .fill("diamante");
  await expect(
    page.getByRole("spinbutton", {
      name: "Preço planejado de Diamante",
      exact: true,
    }),
  ).toHaveValue("1000000");

  const exportResult = await readCSV(page, "Exportar CSV");
  expect(exportResult.download.suggestedFilename()).toBe(
    "catalogo-de-precos.csv",
  );
  expect(exportResult.contents).toContain('"Diamante"');
  expect(exportResult.contents).toContain('"1000000"');
  expect(exportResult.contents.trim().split("\r\n")).toHaveLength(2);

  await navigate(page, "Mineração");
  const grossText = await card(page, "Receita bruta / h")
    .locator(":scope > strong")
    .innerText();
  const netText = await card(page, "Lucro líquido / h")
    .locator(":scope > strong")
    .innerText();
  const activity = demoData.activities.find((a) => a.id === "diamond-mining")!;
  const gross =
    (3600 / activity.cycleSeconds) *
    activity.productiveFraction *
    activity.attemptsPerCycle *
    activity.dropsPerAttempt *
    activity.dropProbability *
    activity.efficiency *
    1_000_000;
  expect(grossText).toBe(money(gross));
  await navigate(page, "Visão geral");
  await expect(
    card(page, "Melhor lucro líquido / h").locator(":scope > strong"),
  ).toHaveText(netText);
  await expect(card(page, "Melhor lucro líquido / h")).toContainText(
    activity.name,
  );
});

test("custos superiores à receita geram prejuízo e eliminam payback", async ({
  page,
}) => {
  await page.goto("/#mining");
  await page
    .getByRole("spinbutton", { name: "Custo fixo por hora (C$)", exact: true })
    .fill("1000000000");
  await expect(
    card(page, "Lucro líquido / h").locator(":scope > strong"),
  ).toContainText("C$ -");
  await expect(card(page, "Lucro líquido / h")).toContainText(
    "Atividade com prejuízo",
  );
  await expect(
    card(page, "Payback estimado").locator(":scope > strong"),
  ).toHaveText("Sem retorno");
  await page
    .getByRole("button", { name: "Resultados detalhados", exact: true })
    .click();
  const profitRow = page
    .getByRole("row")
    .filter({ has: page.getByText("Lucro líquido / h", { exact: true }) });
  await expect(profitRow).toContainText("C$ -");
  await navigate(page, "Investimentos");
  const investmentRow = page.getByRole("row").filter({
    has: page.getByText(
      demoData.activities.find((a) => a.id === "diamond-mining")!.name,
      { exact: true },
    ),
  });
  await expect(investmentRow).toContainText("Sem retorno");
});

test("multiplicadores de cenário alteram resultados e cenário global", async ({
  page,
}) => {
  await page.goto("/#scenarios");
  const probable = page.locator(".scenario-grid > section").filter({
    has: page.getByRole("heading", { name: "Provável", exact: true }),
  });
  const probableRow = page
    .getByRole("row")
    .filter({ has: page.getByText("Provável", { exact: true }) });
  const before = await probableRow.locator("td").nth(2).innerText();
  await probable
    .getByRole("spinbutton", { name: "Preço de venda", exact: false })
    .fill("2");
  const baseGross =
    (3600 / demoData.activities[0].cycleSeconds) *
    demoData.activities[0].productiveFraction *
    demoData.activities[0].attemptsPerCycle *
    demoData.activities[0].dropsPerAttempt *
    demoData.activities[0].dropProbability *
    demoData.activities[0].efficiency *
    demoData.items[0].plannedPrice;
  await expect(probableRow.locator("td").nth(2)).toHaveText(
    money(baseGross * 2).replace(/,00$/, ""),
  );
  expect(await probableRow.locator("td").nth(2).innerText()).not.toBe(before);
  const optimistic = page.locator(".scenario-grid > section").filter({
    has: page.getByRole("heading", { name: "Otimista", exact: true }),
  });
  await optimistic
    .getByRole("button", { name: "Aplicar ao dashboard", exact: true })
    .click();
  await expect(page.getByLabel("Cenário", { exact: true })).toHaveValue(
    "optimistic",
  );
  await page.reload();
  await expect(page.getByLabel("Cenário", { exact: true })).toHaveValue(
    "optimistic",
  );
});

test("importação recusa JSON inválido e aceita catálogo e atividades vazios sem crash", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#settings");
  await page.getByLabel("Selecionar backup JSON").setInputFiles({
    name: "invalido.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"items":[]}'),
  });
  await expect(page.getByRole("alert")).toContainText("Formato inválido");
  const stateBefore = await page.evaluate(
    (key) => localStorage.getItem(key),
    storageKey,
  );
  expect(stateBefore).toBeNull();

  const emptyData = { ...demoData, items: [], activities: [] };
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Selecionar backup JSON").setInputFiles({
    name: "vazio.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(emptyData)),
  });
  await expect(page.getByRole("status")).toContainText("Backup importado");
  await navigate(page, "Tabela de preços");
  await expect(
    page.getByText("0 de 0 registros", { exact: true }),
  ).toBeVisible();
  await navigate(page, "Mineração");
  await expect(
    page.getByText(
      "Você ainda não tem atividades nesta categoria. Crie uma para começar.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Nova atividade", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Adicione primeiro um item",
  );
  await navigate(page, "Cenários");
  await expect(
    page.getByText("Nenhuma atividade disponível para comparar.", {
      exact: true,
    }),
  ).toBeVisible();
  await navigate(page, "Relatórios");
  await expect(
    page.getByText("Nenhum resultado disponível para este relatório.", {
      exact: true,
    }),
  ).toBeVisible();
  await navigate(page, "Visão geral");
  await expect(
    page.getByText("Cadastre uma atividade válida para ver o ranking.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("cadastro de recurso e atividade calcula totais por ciclo e persiste a operação", async ({
  page,
}) => {
  await page.goto("/#prices");
  await page.getByRole("button", { name: "Novo item", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Adicionar recurso" });
  await modal
    .getByRole("textbox", { name: "Nome do item", exact: true })
    .fill("Recurso de teste");
  await modal
    .getByRole("combobox", { name: "Categoria", exact: true })
    .selectOption("other");
  await modal
    .getByRole("spinbutton", { name: "Preço atual", exact: true })
    .fill("5");
  await modal
    .getByRole("spinbutton", { name: "Preço planejado", exact: true })
    .fill("10");
  await modal
    .getByRole("button", { name: "Adicionar item", exact: true })
    .click();
  await expect(modal).not.toBeVisible();
  await page
    .getByRole("textbox", { name: "Buscar item", exact: true })
    .fill("Recurso de teste");
  await expect(page.locator(".price-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".price-table tbody tr")).toContainText("+100,0%");

  await navigate(page, "Outras atividades");
  await page
    .getByRole("button", { name: "Nova atividade", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Nome da atividade", exact: true })
    .fill("Fabricação de teste");
  await page
    .getByRole("combobox", { name: "Recurso principal", exact: true })
    .selectOption({ label: "Recurso de teste" });
  await page
    .getByRole("spinbutton", { name: "Blocos / ações por ciclo", exact: true })
    .fill("6");
  await expect(
    card(page, "Receita bruta / h").locator(":scope > strong"),
  ).toHaveText("C$ 3.600,00");
  await expect(
    card(page, "Lucro líquido / h").locator(":scope > strong"),
  ).toHaveText("C$ 3.600,00");
  const detail = (label: string) =>
    page
      .locator(".result-details > div")
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator("strong");
  await expect(detail("Drops médios por ciclo")).toHaveText("6,00");
  await expect(detail("Receita por ciclo")).toHaveText("C$ 60,00");
  await page.reload();
  await page
    .getByRole("combobox", { name: "Atividade configurada", exact: true })
    .selectOption({ label: "Fabricação de teste" });
  await expect(
    card(page, "Receita bruta / h").locator(":scope > strong"),
  ).toHaveText("C$ 3.600,00");
  await expect(
    page
      .getByRole("combobox", { name: "Recurso principal", exact: true })
      .locator("option:checked"),
  ).toHaveText("Recurso de teste");
});

test("probabilidades exclusivas e ciclo zero mostram erros sem persistir parâmetros inválidos", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#fishing");
  // Zero costs are valid; they must produce revenue equal to net profit.
  await page
    .getByRole("spinbutton", { name: "Custo por ciclo (C$)", exact: true })
    .fill("0");
  await page
    .getByRole("spinbutton", { name: "Custo fixo por hora (C$)", exact: true })
    .fill("0");
  await page
    .getByRole("spinbutton", { name: "Taxa sobre as vendas (%)", exact: true })
    .fill("0");
  await expect(
    card(page, "Custos totais / h").locator(":scope > strong"),
  ).toHaveText("C$ 0,00");
  expect(
    await card(page, "Lucro líquido / h")
      .locator(":scope > strong")
      .innerText(),
  ).toBe(
    await card(page, "Receita bruta / h")
      .locator(":scope > strong")
      .innerText(),
  );
  const validState = await page.evaluate(
    (key) => localStorage.getItem(key),
    storageKey,
  );
  expect(validState).not.toBeNull();

  const treasureChance = page
    .locator(".drop-row")
    .nth(1)
    .getByRole("spinbutton", { name: "Chance (%)", exact: true });
  await treasureChance.fill("20");
  await expect(
    page.getByRole("alert").filter({ hasText: "A soma das probabilidades" }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe(validState);
  await treasureChance.fill("4");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    card(page, "Receita bruta / h").locator(":scope > strong"),
  ).not.toHaveText("C$ 0,00");

  await page
    .getByRole("spinbutton", {
      name: "Duração completa do ciclo (s)",
      exact: true,
    })
    .fill("0");
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "O tempo de ciclo deve ser maior que zero." }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe(validState);
  await page
    .getByRole("spinbutton", {
      name: "Duração completa do ciclo (s)",
      exact: true,
    })
    .fill("24");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("spinbutton", {
      name: "Duração completa do ciclo (s)",
      exact: true,
    }),
  ).toHaveValue("24");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    card(page, "Custos totais / h").locator(":scope > strong"),
  ).toHaveText("C$ 0,00");
  expect(errors).toEqual([]);
});
