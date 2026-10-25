import type { Activity, ActivityResult, PriceItem, Scenario } from "./types";

const emptyResult = (errors: string[]): ActivityResult => ({
  cyclesPerHour: 0,
  dropsPerCycle: 0,
  grossPerCycle: 0,
  dropsPerHour: 0,
  expectedDropValue: 0,
  grossPerHour: 0,
  costPerHour: 0,
  netPerHour: 0,
  paybackHours: null,
  roiPercent: null,
  profit24h: 0,
  profit7d: 0,
  profit30d: 0,
  valid: false,
  errors,
});

/**
 * One shared model for all activities. Tools and enchantments are descriptive;
 * their measured effects must be configured in yield, probability and efficiency.
 * Fixed hourly costs accrue even during downtime; cycle costs follow productive cycles.
 * The scenario cost multiplier affects operational costs, not the sale fee or investment.
 */
export function calculateActivity(
  activity: Activity | undefined,
  item: PriceItem | undefined,
  scenario: Scenario | undefined,
  mode: "current" | "planned" = "planned",
  items?: PriceItem[],
): ActivityResult {
  if (!activity) return emptyResult(["Selecione uma atividade configurada."]);
  const errors: string[] = [];
  const nonnegative = (value: number, label: string) => {
    if (!Number.isFinite(value) || value < 0)
      errors.push(`${label} deve ser um número finito maior ou igual a zero.`);
  };
  const fraction = (value: number, label: string) => {
    if (!Number.isFinite(value) || value < 0 || value > 1)
      errors.push(`${label} deve estar entre 0 e 1.`);
  };

  if (!item) errors.push("Selecione um item com preço configurado.");
  else if (item.id !== activity.itemId)
    errors.push("O item selecionado não corresponde à atividade.");
  if (!scenario) errors.push("Selecione um cenário configurado.");
  if (!Number.isFinite(activity.cycleSeconds) || activity.cycleSeconds <= 0)
    errors.push("O tempo de ciclo deve ser maior que zero.");
  nonnegative(activity.investment, "Investimento");
  nonnegative(activity.attemptsPerCycle, "Tentativas por ciclo");
  nonnegative(activity.unitsPerCycle ?? 1, "Unidades de produção");
  const hasOutputs = Boolean(activity.outputs?.length);
  if (!hasOutputs) nonnegative(activity.dropsPerAttempt, "Drops por tentativa");
  nonnegative(activity.costPerCycle, "Custo por ciclo");
  nonnegative(activity.hourlyCost, "Custo fixo por hora");
  if (!hasOutputs) fraction(activity.dropProbability, "Probabilidade");
  fraction(activity.efficiency, "Eficiência");
  fraction(activity.productiveFraction, "Tempo produtivo");
  fraction(activity.saleFee, "Taxa de venda");
  if (item)
    nonnegative(
      mode === "current" ? item.currentPrice : item.plannedPrice,
      "Preço",
    );
  if (scenario) {
    nonnegative(
      scenario.productivityMultiplier,
      "Multiplicador de produtividade",
    );
    nonnegative(scenario.priceMultiplier, "Multiplicador de preço");
    nonnegative(scenario.costMultiplier, "Multiplicador de custos");
  }
  const outputs = hasOutputs
    ? activity.outputs!
    : [
        {
          itemId: activity.itemId,
          probability: activity.dropProbability,
          dropsPerAttempt: activity.dropsPerAttempt,
        },
      ];
  if (
    activity.outputMode !== undefined &&
    activity.outputMode !== "exclusive" &&
    activity.outputMode !== "independent"
  ) {
    errors.push("O modo de drops deve ser exclusivo ou independente.");
  }
  const resolvedOutputs = outputs.map((output, index) => {
    fraction(output.probability, `Probabilidade do drop ${index + 1}`);
    nonnegative(output.dropsPerAttempt, `Quantidade do drop ${index + 1}`);
    const outputItem =
      output.itemId === item?.id
        ? item
        : items?.find((candidate) => candidate.id === output.itemId);
    if (!outputItem)
      errors.push(`O item do drop ${index + 1} não possui preço configurado.`);
    const price = outputItem
      ? mode === "current"
        ? outputItem.currentPrice
        : outputItem.plannedPrice
      : 0;
    nonnegative(price, `Preço do drop ${index + 1}`);
    return { ...output, price };
  });
  if (
    hasOutputs &&
    activity.outputMode === "exclusive" &&
    outputs.reduce((total, output) => total + output.probability, 0) > 1 + 1e-9
  ) {
    errors.push(
      "A soma das probabilidades de capturas exclusivas não pode ultrapassar 100%.",
    );
  }
  if (errors.length || !item || !scenario) return emptyResult(errors);

  const cyclesPerHour =
    (3600 / activity.cycleSeconds) * activity.productiveFraction;
  const expectedDrops = resolvedOutputs.reduce(
    (total, output) => total + output.probability * output.dropsPerAttempt,
    0,
  );
  const expectedDropValue = resolvedOutputs.reduce(
    (total, output) =>
      total +
      output.probability *
        output.dropsPerAttempt *
        output.price *
        scenario.priceMultiplier,
    0,
  );
  const attemptsPerCycle =
    (activity.unitsPerCycle ?? 1) *
    activity.attemptsPerCycle *
    activity.efficiency *
    scenario.productivityMultiplier;
  const dropsPerCycle = attemptsPerCycle * expectedDrops;
  const grossPerCycle = attemptsPerCycle * expectedDropValue;
  const dropsPerHour = cyclesPerHour * dropsPerCycle;
  const grossPerHour = cyclesPerHour * grossPerCycle;
  const costPerHour =
    (cyclesPerHour * activity.costPerCycle + activity.hourlyCost) *
      scenario.costMultiplier +
    grossPerHour * activity.saleFee;
  const netPerHour = grossPerHour - costPerHour;
  const paybackHours = netPerHour > 0 ? activity.investment / netPerHour : null;
  const roiPercent =
    activity.investment > 0 ? (netPerHour / activity.investment) * 100 : null;
  const result: ActivityResult = {
    cyclesPerHour,
    dropsPerCycle,
    grossPerCycle,
    dropsPerHour,
    expectedDropValue,
    grossPerHour,
    costPerHour,
    netPerHour,
    paybackHours,
    roiPercent,
    profit24h: netPerHour * 24,
    profit7d: netPerHour * 168,
    profit30d: netPerHour * 720,
    valid: true,
    errors: [],
  };
  if (
    Object.values(result).some(
      (value) => typeof value === "number" && !Number.isFinite(value),
    )
  ) {
    return emptyResult([
      "Os parâmetros excedem o limite numérico. Reduza os valores informados.",
    ]);
  }
  return result;
}

/** A zero reference price has no defined percentage variation. */
export function calculatePriceChange(
  current: number,
  planned: number,
): { absolute: number; percent: number | null } {
  if (
    !Number.isFinite(current) ||
    !Number.isFinite(planned) ||
    current < 0 ||
    planned < 0
  )
    return { absolute: 0, percent: null };
  const absolute = planned - current;
  const percent = current > 0 ? (absolute / current) * 100 : null;
  return {
    absolute,
    percent: percent !== null && Number.isFinite(percent) ? percent : null,
  };
}

/** Operational profit only; initial investment is deliberately excluded. */
export function projectProfit(
  result: ActivityResult,
  hoursPerDay: number,
  days: number,
): number {
  if (
    !result.valid ||
    !Number.isFinite(result.netPerHour) ||
    !Number.isFinite(hoursPerDay) ||
    hoursPerDay < 0 ||
    hoursPerDay > 24 ||
    !Number.isFinite(days) ||
    days < 0
  )
    return 0;
  const projected = result.netPerHour * hoursPerDay * days;
  return Number.isFinite(projected) ? projected : 0;
}
