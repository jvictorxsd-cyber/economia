export type Category = "mining" | "farming" | "fishing" | "spawners" | "other";

export const categoryLabels: Record<Category, string> = {
  mining: "Mineração",
  farming: "Plantações",
  fishing: "Pesca",
  spawners: "Spawners",
  other: "Outras atividades",
};

export interface PriceItem {
  id: string;
  name: string;
  category: Category;
  currentPrice: number;
  plannedPrice: number;
  unit: string;
  icon: string;
}

/** Probabilities, efficiency, productiveFraction and saleFee use fractions from 0 to 1. */
export interface Activity {
  id: string;
  name: string;
  category: Category;
  itemId: string;
  investment: number;
  cycleSeconds: number;
  attemptsPerCycle: number;
  /** Number of production units (planted blocks, spawners, etc.); defaults to one. */
  unitsPerCycle?: number;
  dropsPerAttempt: number;
  dropProbability: number;
  efficiency: number;
  productiveFraction: number;
  costPerCycle: number;
  hourlyCost: number;
  saleFee: number;
  tool: string;
  enchants: string;
  notes: string;
  /** Optional weighted yields; when nonempty they replace the base single-item yield. */
  outputs?: { itemId: string; probability: number; dropsPerAttempt: number }[];
  /** Exclusive catches share one roll; independent mob drops may occur together. */
  outputMode?: "exclusive" | "independent";
}

export interface Scenario {
  id: string;
  name: string;
  productivityMultiplier: number;
  priceMultiplier: number;
  costMultiplier: number;
}

export interface Settings {
  currency: string;
  balance: number;
  assets: number;
  hoursPerDay: number;
  scenarioId: string;
}

export interface AppData {
  items: PriceItem[];
  activities: Activity[];
  scenarios: Scenario[];
  settings: Settings;
}

export interface ActivityResult {
  cyclesPerHour: number;
  /** Mean output of one executed cycle, even when no productive hours are configured. */
  dropsPerCycle: number;
  /** Gross expected sale value of one executed cycle. */
  grossPerCycle: number;
  dropsPerHour: number;
  /** Expected sale value of one attempt, before throughput and efficiency. */
  expectedDropValue: number;
  grossPerHour: number;
  costPerHour: number;
  netPerHour: number;
  paybackHours: number | null;
  /** Hourly operational ROI, not a guaranteed investment return. */
  roiPercent: number | null;
  /** Operational profit at 24, 168 and 720 hours, before initial investment. */
  profit24h: number;
  profit7d: number;
  profit30d: number;
  valid: boolean;
  errors: string[];
}
