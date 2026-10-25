import { demoData } from "../data/demo";
import type { AppData } from "../domain/types";

export const STORAGE_KEY = "economia.minecraft.v1";
const VERSION = 1;
const categories = new Set([
  "mining",
  "farming",
  "fishing",
  "spawners",
  "other",
]);
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown, max = 200, empty = false): value is string =>
  typeof value === "string" &&
  value.length <= max &&
  (empty || value.trim().length > 0);
const amount = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 1e15;
const fraction = (value: unknown): value is number =>
  amount(value) && value <= 1;
const distinctIds = (values: Record<string, unknown>[]) =>
  new Set(values.map((value) => value.id)).size === values.length;

function validOutputs(
  value: unknown,
  mode: unknown,
  itemIds: Set<unknown>,
): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length > 100) return false;
  let sum = 0;
  for (const output of value) {
    if (
      !record(output) ||
      !text(output.itemId, 100) ||
      !itemIds.has(output.itemId) ||
      !fraction(output.probability) ||
      !amount(output.dropsPerAttempt)
    )
      return false;
    sum += output.probability;
  }
  return mode !== "exclusive" || sum <= 1 + 1e-9;
}

/** Validate imported/persisted data before it can reach formulas or form inputs. */
export function validateData(value: unknown): value is AppData {
  if (
    !record(value) ||
    !Array.isArray(value.items) ||
    !Array.isArray(value.activities) ||
    !Array.isArray(value.scenarios) ||
    !record(value.settings)
  )
    return false;
  // Empty catalogs/activities are supported; at least one scenario is required.
  if (
    value.items.length > 50000 ||
    value.activities.length > 10000 ||
    !value.scenarios.length ||
    value.scenarios.length > 100
  )
    return false;
  if (
    !value.items.every(
      (item) =>
        record(item) &&
        text(item.id, 100) &&
        text(item.name) &&
        text(item.category) &&
        categories.has(item.category) &&
        amount(item.currentPrice) &&
        amount(item.plannedPrice) &&
        text(item.unit, 50) &&
        text(item.icon, 50),
    )
  )
    return false;
  if (!distinctIds(value.items)) return false;
  const itemIds = new Set(value.items.map((item) => item.id));
  if (
    !value.activities.every(
      (activity) =>
        record(activity) &&
        text(activity.id, 100) &&
        text(activity.name) &&
        text(activity.category) &&
        categories.has(activity.category) &&
        text(activity.itemId, 100) &&
        itemIds.has(activity.itemId) &&
        amount(activity.investment) &&
        amount(activity.cycleSeconds) &&
        activity.cycleSeconds > 0 &&
        amount(activity.attemptsPerCycle) &&
        amount(activity.dropsPerAttempt) &&
        (activity.unitsPerCycle === undefined ||
          amount(activity.unitsPerCycle)) &&
        fraction(activity.dropProbability) &&
        fraction(activity.efficiency) &&
        fraction(activity.productiveFraction) &&
        amount(activity.costPerCycle) &&
        amount(activity.hourlyCost) &&
        fraction(activity.saleFee) &&
        (activity.outputMode === undefined ||
          activity.outputMode === "exclusive" ||
          activity.outputMode === "independent") &&
        validOutputs(activity.outputs, activity.outputMode, itemIds) &&
        text(activity.tool, 200, true) &&
        text(activity.enchants, 200, true) &&
        text(activity.notes, 5000, true),
    )
  )
    return false;
  if (!distinctIds(value.activities)) return false;
  if (
    !value.scenarios.every(
      (scenario) =>
        record(scenario) &&
        text(scenario.id, 100) &&
        text(scenario.name) &&
        amount(scenario.productivityMultiplier) &&
        amount(scenario.priceMultiplier) &&
        amount(scenario.costMultiplier),
    )
  )
    return false;
  if (!distinctIds(value.scenarios)) return false;
  const settings = value.settings;
  return (
    text(settings.currency, 16) &&
    amount(settings.balance) &&
    amount(settings.assets) &&
    amount(settings.hoursPerDay) &&
    settings.hoursPerDay <= 24 &&
    text(settings.scenarioId, 100) &&
    value.scenarios.some((scenario) => scenario.id === settings.scenarioId)
  );
}

const freshDemo = (): AppData =>
  JSON.parse(JSON.stringify(demoData)) as AppData;

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshDemo();
    const envelope: unknown = JSON.parse(raw);
    if (
      record(envelope) &&
      envelope.version === VERSION &&
      validateData(envelope.data)
    ) {
      return envelope.data;
    }
  } catch {
    // Storage may be unavailable, disabled, over quota, or hold malformed JSON.
  }
  return freshDemo();
}

/** Returns false if storage is unavailable; the caller can show a clear warning. */
export function saveData(data: AppData): boolean {
  if (!validateData(data)) return false;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: VERSION, data }),
    );
    return true;
  } catch {
    return false;
  }
}

export function resetData(): AppData {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Session data still resets. */
  }
  return freshDemo();
}
