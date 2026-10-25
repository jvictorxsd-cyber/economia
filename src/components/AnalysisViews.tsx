import { useRef, useState, type ChangeEvent } from "react";
import {
  BarChart3,
  Check,
  Clock3,
  Download,
  RotateCcw,
  Settings2,
  ShieldCheck,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";
import type { AppData, Scenario } from "../domain/types";
import {
  calculateActivity,
  calculatePriceChange,
  projectProfit,
} from "../domain/economics";
import { resetData, validateData } from "../lib/storage";
import { csvText } from "../lib/format";

type Props = { data: AppData; onChange: (next: AppData) => void };
const numeric = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const money = (value: number, currency: string) =>
  `${currency} ${numeric.format(value)}`;
const percent = (value: number | null) =>
  value === null ? "—" : `${numeric.format(value)}%`;
const selectedScenario = (data: AppData) =>
  data.scenarios.find((s) => s.id === data.settings.scenarioId) ??
  data.scenarios[0];
const rowsFor = (data: AppData, scenario = selectedScenario(data)) =>
  data.activities.flatMap((activity) => {
    const item = data.items.find((i) => i.id === activity.itemId);
    return item && scenario
      ? [
          {
            activity,
            item,
            result: calculateActivity(
              activity,
              item,
              scenario,
              "planned",
              data.items,
            ),
          },
        ]
      : [];
  });

function download(
  contents: string,
  filename: string,
  type = "text/csv;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function InvestmentsView({ data }: Props) {
  const rows = rowsFor(data).sort(
    (a, b) => b.result.netPerHour - a.result.netPerHour,
  );
  const currency = data.settings.currency;
  const viable = rows.filter(
    (row) => row.result.valid && row.result.netPerHour > 0,
  );
  const fastest = [...viable]
    .filter((row) => row.result.paybackHours !== null)
    .sort(
      (a, b) =>
        (a.result.paybackHours ?? Infinity) -
        (b.result.paybackHours ?? Infinity),
    )[0];
  const totalInvestment = rows.reduce(
    (total, row) => total + row.activity.investment,
    0,
  );
  return (
    <div className="view-stack">
      <div className="page-heading">
        <div>
          <div className="eyebrow">CADA INVESTIMENTO, UMA DECISÃO</div>
          <h1>Investimentos</h1>
          <p>Compare o capital necessário e o tempo esperado de retorno.</p>
        </div>
      </div>
      {rows.some((row) => !row.result.valid) && (
        <div className="notice" role="alert">
          Há atividades com parâmetros inválidos. Corrija-as no simulador;
          valores zerados nessas linhas não representam uma estimativa válida.
        </div>
      )}
      <div className="stat-grid">
        <div className="stat-card">
          <span className="muted">Capital inicial da carteira</span>
          <strong>{money(totalInvestment, currency)}</strong>
          <small className="muted">Soma dos investimentos cadastrados</small>
        </div>
        <div className="stat-card">
          <span className="muted">Atividades com lucro</span>
          <strong>
            {viable.length}
            <small> / {rows.length}</small>
          </strong>
          <small className="muted">
            No cenário {selectedScenario(data)?.name ?? "selecionado"}
          </small>
        </div>
        <div className="stat-card">
          <span className="muted">Menor tempo de retorno</span>
          <strong>
            {fastest
              ? `${numeric.format(fastest.result.paybackHours!)} h`
              : "—"}
          </strong>
          <small className="muted">
            {fastest?.activity.name ??
              "Nenhum investimento com retorno positivo"}
          </small>
        </div>
        <div className="stat-card">
          <span className="muted">Rotina de simulação</span>
          <strong>
            {numeric.format(data.settings.hoursPerDay)} h<small> / dia</small>
          </strong>
          <small className="muted">Ajustável em Configurações</small>
        </div>
      </div>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="section-title">Investimentos e retorno</h2>
            <p className="muted">
              Quanto investir, quanto receber e quando recuperar o capital.
            </p>
          </div>
          <span className="badge badge-green">
            <Clock3 size={13} /> Payback simples
          </span>
        </div>
        <div className="table-wrap">
          <table
            className="data-table"
            aria-label="Investimentos e projeções por atividade"
          >
            <thead>
              <tr>
                <th>Atividade</th>
                <th>Investimento</th>
                <th>Lucro / hora</th>
                <th>Retorno</th>
                <th>ROI em 24 h</th>
                <th>Lucro em 24 h operacionais</th>
                <th>Lucro em 7 dias</th>
                <th>Lucro em 30 dias</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ activity, item, result }) => (
                <tr key={activity.id}>
                  <td>
                    <span className="item-cell">
                      <span>{item.icon}</span>
                      <strong>{activity.name}</strong>
                    </span>
                  </td>
                  <td>{money(activity.investment, currency)}</td>
                  <td
                    className={result.netPerHour >= 0 ? "positive" : "negative"}
                  >
                    {money(result.netPerHour, currency)}
                  </td>
                  <td>
                    {!result.valid
                      ? "Dados inválidos"
                      : result.paybackHours === null
                        ? "Sem retorno"
                        : `${numeric.format(result.paybackHours)} h`}
                  </td>
                  <td>
                    {result.roiPercent === null
                      ? "—"
                      : percent(result.roiPercent * 24)}
                  </td>
                  <td>{money(result.profit24h, currency)}</td>
                  <td>
                    {money(
                      projectProfit(result, data.settings.hoursPerDay, 7),
                      currency,
                    )}
                  </td>
                  <td>
                    {money(
                      projectProfit(result, data.settings.hoursPerDay, 30),
                      currency,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <div className="empty-state">
            Cadastre uma atividade e associe um item para estimar o retorno.
          </div>
        )}
        <div className="notice">
          Projeções de lucro operacional: o investimento inicial é exibido
          separadamente. Para obter o resultado após recuperar o capital,
          subtraia o investimento do lucro acumulado. Valores não incluem juros
          nem valorização patrimonial.
        </div>
      </section>
    </div>
  );
}

export function ScenariosView({ data, onChange }: Props) {
  const [activityId, setActivityId] = useState(data.activities[0]?.id ?? "");
  const activity =
    data.activities.find((a) => a.id === activityId) ?? data.activities[0];
  const item = data.items.find((i) => i.id === activity?.itemId);
  const update = (
    id: string,
    field: keyof Pick<
      Scenario,
      "productivityMultiplier" | "priceMultiplier" | "costMultiplier"
    >,
    value: string,
  ) => {
    if (!value.trim()) return;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > 1000) return;
    onChange({
      ...data,
      scenarios: data.scenarios.map((s) =>
        s.id === id ? { ...s, [field]: number } : s,
      ),
    });
  };
  const outcomes = data.scenarios.map((scenario) => ({
    scenario,
    result:
      activity && item
        ? calculateActivity(activity, item, scenario, "planned", data.items)
        : null,
  }));
  const maxGross = Math.max(
    1,
    ...outcomes.map((o) => Math.abs(o.result?.netPerHour ?? 0)),
  );
  return (
    <div className="view-stack">
      <div className="page-heading">
        <div>
          <div className="eyebrow">EXPLORE AS POSSIBILIDADES</div>
          <h1>Cenários</h1>
          <p>
            Ajuste as hipóteses e compare diferentes perspectivas da economia.
          </p>
        </div>
      </div>
      {outcomes.some((outcome) => outcome.result && !outcome.result.valid) && (
        <div className="notice" role="alert">
          Revise os parâmetros da atividade no simulador antes de comparar.{" "}
          {outcomes
            .find((outcome) => outcome.result && !outcome.result.valid)
            ?.result?.errors.join(" ")}
        </div>
      )}
      <div className="notice">
        <ShieldCheck size={17} />
        <span>
          Hipóteses de planejamento. Multiplicadores ajustam a produção, o preço
          de venda e os custos de cada atividade; não são previsões do servidor.
        </span>
      </div>
      <div
        className="scenario-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20,
        }}
      >
        {data.scenarios.map((scenario, index) => (
          <section className="panel" key={scenario.id} style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <h2 className="section-title">{scenario.name}</h2>
              <span
                className={`badge ${index === 1 ? "badge-green" : index === 0 ? "badge-orange" : "badge-purple"}`}
              >
                {data.settings.scenarioId === scenario.id
                  ? "Em uso"
                  : "Simulação"}
              </span>
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              <label className="field">
                Produtividade <span className="muted">multiplicador ×</span>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="0.05"
                  value={scenario.productivityMultiplier}
                  onChange={(event) =>
                    update(
                      scenario.id,
                      "productivityMultiplier",
                      event.target.value,
                    )
                  }
                />
              </label>
              <label className="field">
                Preço de venda <span className="muted">multiplicador ×</span>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="0.05"
                  value={scenario.priceMultiplier}
                  onChange={(event) =>
                    update(scenario.id, "priceMultiplier", event.target.value)
                  }
                />
              </label>
              <label className="field">
                Custos operacionais{" "}
                <span className="muted">multiplicador ×</span>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="0.05"
                  value={scenario.costMultiplier}
                  onChange={(event) =>
                    update(scenario.id, "costMultiplier", event.target.value)
                  }
                />
              </label>
              <button
                className={`button ${data.settings.scenarioId === scenario.id ? "button-ghost" : "button-primary"}`}
                onClick={() =>
                  onChange({
                    ...data,
                    settings: { ...data.settings, scenarioId: scenario.id },
                  })
                }
              >
                {data.settings.scenarioId === scenario.id ? (
                  <>
                    <Check size={16} /> Cenário selecionado
                  </>
                ) : (
                  "Aplicar ao dashboard"
                )}
              </button>
            </div>
          </section>
        ))}
      </div>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="section-title">
              A mesma atividade, diferentes perspectivas
            </h2>
            <p className="muted">
              Compare o efeito das hipóteses no lucro por hora.
            </p>
          </div>
          <select
            aria-label="Atividade para comparar cenários"
            disabled={!data.activities.length}
            value={activity?.id ?? ""}
            onChange={(event) => setActivityId(event.target.value)}
          >
            {!data.activities.length && (
              <option value="">Nenhuma atividade cadastrada</option>
            )}
            {data.activities.map((a) => (
              <option value={a.id} key={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        {activity && item ? (
          <>
            <div style={{ padding: "8px 24px 24px", display: "grid", gap: 20 }}>
              {outcomes.map(({ scenario, result }, index) => (
                <div
                  key={scenario.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(65px, .8fr) minmax(0, 2fr) minmax(85px, 1fr)",
                    gap: 16,
                    alignItems: "center",
                  }}
                >
                  <span>{scenario.name}</span>
                  <div
                    style={{
                      background: "var(--surface-subtle, #f1f5f3)",
                      borderRadius: 4,
                      height: 24,
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(0, (Math.abs(result?.netPerHour ?? 0) / maxGross) * 100)}%`,
                        height: "100%",
                        borderRadius: 4,
                        background:
                          (result?.netPerHour ?? 0) < 0
                            ? "#dc5c60"
                            : ["#90aca0", "#159b70", "#4bbaa0"][index % 3],
                      }}
                    />
                  </div>
                  <strong
                    className={
                      (result?.netPerHour ?? 0) >= 0 ? "positive" : "negative"
                    }
                  >
                    {money(result?.netPerHour ?? 0, data.settings.currency)}
                  </strong>
                </div>
              ))}
            </div>
            <div className="table-wrap">
              <table
                className="data-table"
                aria-label="Comparação de resultados por cenário"
              >
                <thead>
                  <tr>
                    <th>Cenário</th>
                    <th>Drops / hora</th>
                    <th>Receita / hora</th>
                    <th>Custos / hora</th>
                    <th>Lucro / hora</th>
                    <th>Payback</th>
                  </tr>
                </thead>
                <tbody>
                  {outcomes.map(({ scenario, result }) => (
                    <tr key={scenario.id}>
                      <td>
                        <strong>{scenario.name}</strong>
                      </td>
                      <td>{numeric.format(result?.dropsPerHour ?? 0)}</td>
                      <td>
                        {money(
                          result?.grossPerHour ?? 0,
                          data.settings.currency,
                        )}
                      </td>
                      <td>
                        {money(
                          result?.costPerHour ?? 0,
                          data.settings.currency,
                        )}
                      </td>
                      <td
                        className={
                          (result?.netPerHour ?? 0) >= 0
                            ? "positive"
                            : "negative"
                        }
                      >
                        {money(result?.netPerHour ?? 0, data.settings.currency)}
                      </td>
                      <td>
                        {result?.paybackHours === null ||
                        result?.paybackHours === undefined
                          ? "Sem retorno"
                          : `${numeric.format(result.paybackHours)} h`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="empty-state">
            Nenhuma atividade disponível para comparar.
          </div>
        )}
      </section>
    </div>
  );
}

export function ReportsView({ data }: Props) {
  const allRows = rowsFor(data);
  const invalidRows = allRows.filter((row) => !row.result.valid);
  const rows = allRows
    .filter((row) => row.result.valid)
    .sort((a, b) => b.result.netPerHour - a.result.netPerHour);
  const currency = data.settings.currency;
  const sum = (field: "grossPerHour" | "costPerHour" | "netPerHour") =>
    rows.reduce((total, row) => total + row.result[field], 0);
  const currentBasket = data.items.reduce(
    (total, item) => total + item.currentPrice,
    0,
  );
  const plannedBasket = data.items.reduce(
    (total, item) => total + item.plannedPrice,
    0,
  );
  const change = calculatePriceChange(currentBasket, plannedBasket);
  const exportReport = () =>
    download(
      csvText([
        [
          "Dados demonstrativos / configurados pelo usuário — valores estimados",
        ],
        ["Cenário", selectedScenario(data)?.name ?? ""],
        [
          "Atividade",
          "Item",
          "Receita/h",
          "Custos/h",
          "Lucro/h",
          "Investimento",
          "Payback (h)",
          `Lucro 7 dias (${data.settings.hoursPerDay}h/dia)`,
          `Lucro 30 dias (${data.settings.hoursPerDay}h/dia)`,
        ],
        ...rows.map(({ activity, item, result }) => [
          activity.name,
          item.name,
          result.grossPerHour,
          result.costPerHour,
          result.netPerHour,
          activity.investment,
          result.paybackHours,
          projectProfit(result, data.settings.hoursPerDay, 7),
          projectProfit(result, data.settings.hoursPerDay, 30),
        ]),
        [
          "Totais de operação simultânea",
          "",
          sum("grossPerHour"),
          sum("costPerHour"),
          sum("netPerHour"),
        ],
      ]),
      "economia-relatorio.csv",
    );
  return (
    <div className="view-stack">
      <div className="page-heading">
        <div>
          <div className="eyebrow">SEUS RESULTADOS, EM DETALHES</div>
          <h1>Relatórios</h1>
          <p>
            Encontre as atividades com maior rentabilidade e exporte sua
            análise.
          </p>
        </div>
      </div>
      {invalidRows.length > 0 && (
        <div className="notice" role="alert">
          {invalidRows.length} atividade(s) com parâmetros inválidos foram
          excluídas do ranking, dos totais e da exportação:{" "}
          {invalidRows.map((row) => row.activity.name).join(", ")}. Corrija-as
          no simulador.
        </div>
      )}
      <div className="stat-grid">
        <div className="stat-card">
          <span className="muted">Lucro médio por atividade</span>
          <strong>
            {money(rows.length ? sum("netPerHour") / rows.length : 0, currency)}
          </strong>
          <small className="muted">Por hora de operação</small>
        </div>
        <div className="stat-card">
          <span className="muted">Variação da cesta de preços</span>
          <strong className={change.absolute >= 0 ? "positive" : "negative"}>
            {percent(change.percent)}
          </strong>
          <small className="muted">
            Uma unidade de cada item · sem ponderação
          </small>
        </div>
        <div className="stat-card">
          <span className="muted">Melhor atividade</span>
          <strong style={{ fontSize: 21 }}>
            {rows[0]?.activity.name ?? "—"}
          </strong>
          <small className="muted">
            {rows[0]
              ? `${money(rows[0].result.netPerHour, currency)} / hora`
              : "Nenhuma atividade cadastrada"}
          </small>
        </div>
        <div className="stat-card">
          <span className="muted">Cobertura do catálogo</span>
          <strong>
            {data.items.length}
            <small> itens</small>
          </strong>
          <small className="muted">
            {rows.length} atividades com vínculo de preço
          </small>
        </div>
      </div>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="section-title">Relatório de rentabilidade</h2>
            <p className="muted">
              Ranking por lucro líquido, do maior para o menor.
            </p>
          </div>
          <button className="button button-primary" onClick={exportReport}>
            <Download size={16} /> Exportar relatório
          </button>
        </div>
        <div className="table-wrap">
          <table
            className="data-table"
            aria-label="Ranking de rentabilidade das atividades"
          >
            <thead>
              <tr>
                <th>Posição</th>
                <th>Atividade</th>
                <th>Receita / hora</th>
                <th>Custos / hora</th>
                <th>Lucro / hora</th>
                <th>Margem líquida</th>
                <th>Em 30 dias</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ activity, item, result }, index) => (
                <tr key={activity.id}>
                  <td>
                    <span
                      className={`badge ${index === 0 ? "badge-green" : ""}`}
                    >
                      #{index + 1}
                    </span>
                  </td>
                  <td>
                    <span className="item-cell">
                      <span>{item.icon}</span>
                      <strong>{activity.name}</strong>
                    </span>
                  </td>
                  <td>{money(result.grossPerHour, currency)}</td>
                  <td>{money(result.costPerHour, currency)}</td>
                  <td
                    className={result.netPerHour >= 0 ? "positive" : "negative"}
                  >
                    {money(result.netPerHour, currency)}
                  </td>
                  <td>
                    {result.grossPerHour > 0
                      ? percent((result.netPerHour / result.grossPerHour) * 100)
                      : "—"}
                  </td>
                  <td>
                    {money(
                      projectProfit(result, data.settings.hoursPerDay, 30),
                      currency,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>
                  <strong>Total · operação simultânea</strong>
                </td>
                <td>{money(sum("grossPerHour"), currency)}</td>
                <td>{money(sum("costPerHour"), currency)}</td>
                <td>{money(sum("netPerHour"), currency)}</td>
                <td>
                  {sum("grossPerHour") > 0
                    ? percent((sum("netPerHour") / sum("grossPerHour")) * 100)
                    : "—"}
                </td>
                <td>
                  {money(
                    rows.reduce(
                      (total, row) =>
                        total +
                        projectProfit(
                          row.result,
                          data.settings.hoursPerDay,
                          30,
                        ),
                      0,
                    ),
                    currency,
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {!rows.length && (
          <div className="empty-state">
            Nenhum resultado disponível para este relatório.
          </div>
        )}
        <div className="notice">
          <BarChart3 size={18} />
          <span>
            A soma considera todas as atividades funcionando em paralelo durante
            uma hora. Um jogador alternando atividades deve ponderar o tempo
            dedicado a cada uma. A variação da cesta é apenas um indicador de
            preços, sem medir a inflação real do servidor.
          </span>
        </div>
      </section>
      <section className="panel" style={{ padding: 24 }}>
        <h2 className="section-title">Como interpretar estes resultados</h2>
        <div className="form-grid" style={{ marginTop: 20 }}>
          <div>
            <TrendingUp size={22} />
            <h3>Receita não é lucro</h3>
            <p className="muted">
              Receita é o valor esperado de venda. Custos incluem operação,
              ferramentas, manutenção e taxas configuradas. O lucro líquido é a
              diferença.
            </p>
          </div>
          <div>
            <Clock3 size={22} />
            <h3>Tempo efetivamente produtivo</h3>
            <p className="muted">
              Eficiência e fração produtiva reduzem os ciclos realizados.
              Projeções de 7 e 30 dias respeitam{" "}
              {numeric.format(data.settings.hoursPerDay)} horas de operação por
              dia.
            </p>
          </div>
          <div>
            <Wallet size={22} />
            <h3>Retorno do capital</h3>
            <p className="muted">
              Payback divide o investimento pelo lucro líquido por hora. Se o
              lucro é zero ou negativo, não existe retorno estimado.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function SettingsView({ data, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const updateNumber = (
    field: "balance" | "assets" | "hoursPerDay",
    raw: string,
  ) => {
    if (!raw.trim()) return;
    const value = Number(raw);
    if (
      !Number.isFinite(value) ||
      value < 0 ||
      value > 1e15 ||
      (field === "hoursPerDay" && value > 24)
    )
      return;
    onChange({ ...data, settings: { ...data.settings, [field]: value } });
  };
  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("O arquivo excede o limite de 5 MB.");
      const parsed: unknown = JSON.parse(await file.text());
      if (!validateData(parsed))
        throw new Error(
          "Formato inválido: confira os itens, vínculos, parâmetros e cenários do arquivo.",
        );
      if (
        window.confirm(
          "Importar este backup e substituir os dados locais atuais?",
        )
      ) {
        onChange(parsed);
        setIsError(false);
        setMessage("Backup importado. Os resultados já foram recalculados.");
      }
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível importar o arquivo.",
      );
    } finally {
      event.target.value = "";
    }
  };
  return (
    <div className="view-stack">
      <div className="page-heading">
        <div>
          <div className="eyebrow">UMA ECONOMIA DO SEU JEITO</div>
          <h1>Configurações</h1>
          <p>
            Personalize os parâmetros gerais e mantenha uma cópia dos seus
            dados.
          </p>
        </div>
      </div>
      <div className="notice">
        <ShieldCheck size={17} />
        <span>
          Os dados ficam neste navegador. Exporte um backup para transferi-los
          para outro dispositivo. Nenhuma credencial ou conexão ao servidor
          Minecraft é necessária.
        </span>
      </div>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="section-title">Preferências da economia</h2>
            <p className="muted">
              Os ajustes são salvos automaticamente e atualizam todos os
              módulos.
            </p>
          </div>
          <Settings2 size={20} className="muted" />
        </div>
        <div className="form-grid" style={{ padding: 24 }}>
          <label className="field">
            Símbolo da moeda
            <input
              maxLength={12}
              value={data.settings.currency}
              onChange={(event) => {
                const currency = event.target.value;
                if (currency.trim())
                  onChange({
                    ...data,
                    settings: { ...data.settings, currency },
                  });
              }}
            />
            <small className="muted">
              Ex.: C$, $, moedas. Não converte valores.
            </small>
          </label>
          <label className="field">
            Saldo disponível
            <input
              type="number"
              min="0"
              max="1000000000000000"
              step="any"
              value={data.settings.balance}
              onChange={(event) => updateNumber("balance", event.target.value)}
            />
            <small className="muted">
              Valor configurado manualmente pelo usuário.
            </small>
          </label>
          <label className="field">
            Valor dos ativos
            <input
              type="number"
              min="0"
              max="1000000000000000"
              step="any"
              value={data.settings.assets}
              onChange={(event) => updateNumber("assets", event.target.value)}
            />
            <small className="muted">
              Ativos sem incluir o saldo disponível.
            </small>
          </label>
          <label className="field">
            Horas de operação por dia
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={data.settings.hoursPerDay}
              onChange={(event) =>
                updateNumber("hoursPerDay", event.target.value)
              }
            />
            <small className="muted">
              De 0 a 24. Afeta projeções de dias e meses.
            </small>
          </label>
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="section-title">Backup e portabilidade</h2>
            <p className="muted">
              Preços, atividades, cenários e preferências em um arquivo JSON.
            </p>
          </div>
        </div>
        <div
          style={{
            padding: 24,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            className="button button-primary"
            onClick={() =>
              download(
                JSON.stringify(data, null, 2),
                "economia-backup.json",
                "application/json",
              )
            }
          >
            <Download size={16} /> Exportar backup
          </button>
          <button
            className="button button-ghost"
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={16} /> Importar backup
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            aria-label="Selecionar backup JSON"
            hidden
            onChange={importBackup}
          />
        </div>
        {message && (
          <p
            role={isError ? "alert" : "status"}
            className={isError ? "negative" : "positive"}
            style={{ padding: "0 24px 24px", margin: 0 }}
          >
            {message}
          </p>
        )}
      </section>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="section-title">Restaurar demonstração</h2>
            <p className="muted">
              Substitui os dados deste navegador pelos exemplos iniciais.
              Exporte um backup antes de continuar.
            </p>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          <button
            className="button button-ghost"
            style={{ color: "#b74b51" }}
            onClick={() => {
              if (
                window.confirm(
                  "Restaurar todos os exemplos? As alterações locais serão substituídas.",
                )
              ) {
                onChange(resetData());
                setIsError(false);
                setMessage("Dados demonstrativos restaurados.");
              }
            }}
          >
            <RotateCcw size={16} /> Restaurar dados demonstrativos
          </button>
        </div>
      </section>
    </div>
  );
}
