import { describe, it, expect } from "vitest";
import { csvText, money, percent } from "./format";
describe("exportação CSV e apresentação financeira", () => {
  it("preserva prejuízos numéricos como números, sem apóstrofo", () => {
    expect(csvText([["Lucro", -1250.75, 0, null]])).toBe(
      '\uFEFF"Lucro";"-1250.75";"0";""',
    );
  });
  it("protege textos que poderiam virar fórmulas sem alterar números negativos", () => {
    expect(csvText([["=SUM(A1)", " +cmd", "@comando", "-texto", -2]])).toBe(
      '\uFEFF"\'=SUM(A1)";"\' +cmd";"\'@comando";"\'-texto";"-2"',
    );
  });
  it("preserva acentos, aspas, separadores e quebras de linha", () => {
    expect(csvText([["Cabeçalho"], ['Preço; "diamante"\nNovo']])).toBe(
      '\uFEFF"Cabeçalho"\r\n"Preço; ""diamante""\nNovo"',
    );
  });
  it("formata moeda e base zero de forma explícita", () => {
    expect(money(1250.5)).toBe("C$ 1.250,50");
    expect(percent(null)).toBe("Sem base");
    expect(percent(-50)).toBe("-50,0%");
  });
});
