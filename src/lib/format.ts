export const number = (n: number, digits = 0) =>
  Number.isFinite(n)
    ? new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(n)
    : "—";
export const money = (n: number, currency = "C$") =>
  `${currency} ${number(n, 2)}`;
export const percent = (n: number | null) =>
  n === null ? "Sem base" : `${n > 0 ? "+" : ""}${number(n, 1)}%`;
/** Quote every cell, preserve numeric losses, and neutralize spreadsheet formulas in labels. */
export function csvText(rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => {
    let value = String(v ?? "");
    if (typeof v === "string" && /^[\s]*[=+\-@\t\r]/.test(value))
      value = `'${value}`;
    return `"${value.replaceAll('"', '""')}"`;
  };
  return "\uFEFF" + rows.map((row) => row.map(cell).join(";")).join("\r\n");
}
export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number | null)[][],
) {
  const url = URL.createObjectURL(
    new Blob([csvText([headers, ...rows])], {
      type: "text/csv;charset=utf-8;",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
