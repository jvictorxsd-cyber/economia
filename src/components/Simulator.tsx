import { useState } from "react";
import {
  ArrowRight,
  Clock3,
  Coins,
  Download,
  Gauge,
  Plus,
  Save,
  Trash2,
  TrendingUp,
  TriangleAlert,
  Calculator,
} from "lucide-react";
import type { Activity, AppData, Category } from "../domain/types";
import { categoryLabels } from "../domain/types";
import { calculateActivity, projectProfit } from "../domain/economics";
import { money, number, downloadCSV } from "../lib/format";
import { Metric, Empty } from "./Shared";
import PriceCatalog from "./PriceCatalog";
const descriptions: Record<Category, string> = {
  mining:
    "Ferramentas, encantamentos e drops. Descubra o valor de cada expedição.",
  farming: "Da semente à colheita: modele a produtividade da sua plantação.",
  fishing: "Compare capturas, probabilidades e o retorno de cada lançamento.",
  spawners: "Encontre o equilíbrio entre geração, coleta e custo operacional.",
  other:
    "Criação, comércio, exploração e fabricação: modele sua própria atividade.",
};
export default function Simulator({
  data,
  onChange,
  category,
}: {
  data: AppData;
  onChange: (d: AppData) => void;
  category: Category;
}) {
  const activities = data.activities.filter((a) => a.category === category);
  const [selected, setSelected] = useState(activities[0]?.id ?? "");
  const [tab, setTab] = useState("parameters");
  const [feedback, setFeedback] = useState("");
  const activity = activities.find((a) => a.id === selected) ?? activities[0];
  const scenario =
    data.scenarios.find((s) => s.id === data.settings.scenarioId) ??
    data.scenarios[0];
  const item = data.items.find((i) => i.id === activity?.itemId);
  const c = data.settings.currency;
  const result = calculateActivity(
    activity,
    item,
    scenario,
    "planned",
    data.items,
  );
  const current = calculateActivity(
    activity,
    item,
    scenario,
    "current",
    data.items,
  );
  const update = (patch: Partial<Activity>) => {
    if (activity)
      onChange({
        ...data,
        activities: data.activities.map((a) =>
          a.id === activity.id ? { ...a, ...patch } : a,
        ),
      });
  };
  const create = () => {
    if (!data.items.length) {
      setFeedback("Adicione primeiro um item no catálogo de preços.");
      return;
    }
    const id = crypto.randomUUID();
    const itemId =
      data.items.find((i) => i.category === category)?.id ?? data.items[0].id;
    const next: Activity = {
      id,
      name: `Nova atividade de ${categoryLabels[category].toLowerCase()}`,
      category,
      itemId,
      investment: 0,
      cycleSeconds: 60,
      attemptsPerCycle: 1,
      dropsPerAttempt: 1,
      dropProbability: 1,
      efficiency: 1,
      productiveFraction: 1,
      costPerCycle: 0,
      hourlyCost: 0,
      saleFee: 0,
      tool: "Configurar equipamento",
      enchants: "Nenhum",
      unitsPerCycle: 1,
      notes:
        "Hipótese configurada pelo usuário. Ajuste os parâmetros ao seu servidor.",
    };
    onChange({ ...data, activities: [...data.activities, next] });
    setSelected(id);
    setTab("parameters");
  };
  const exportResult = () => {
    if (!activity) return;
    downloadCSV(
      "simulacao-" + activity.category + ".csv",
      [
        "Atividade",
        "Cenário",
        "Receita/h",
        "Custos/h",
        "Lucro/h",
        "Drops/h",
        "Payback (h)",
        "Lucro em 24 h operacionais",
        "Lucro em 7 dias",
        "Lucro em 30 dias",
      ],
      [
        [
          activity.name,
          scenario.name,
          result.grossPerHour,
          result.costPerHour,
          result.netPerHour,
          result.dropsPerHour,
          result.paybackHours,
          result.profit24h,
          projectProfit(result, data.settings.hoursPerDay, 7),
          projectProfit(result, data.settings.hoursPerDay, 30),
        ],
      ],
    );
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">LABORATÓRIO DE RENTABILIDADE</div>
          <h1>{categoryLabels[category]}</h1>
          <p>{descriptions[category]}</p>
        </div>
        <div className="button-row">
          <button
            className="button"
            onClick={exportResult}
            disabled={!activity || !result.valid}
          >
            <Download size={16} /> Exportar
          </button>
          <button className="button button-primary" onClick={create}>
            <Plus size={16} /> Nova atividade
          </button>
        </div>
      </div>
      <div className="tabs">
        <button
          className={tab === "parameters" ? "active" : ""}
          onClick={() => setTab("parameters")}
        >
          <Calculator size={15} /> Simulador
        </button>
        <button
          className={tab === "results" ? "active" : ""}
          onClick={() => setTab("results")}
        >
          Resultados detalhados
        </button>
        <button
          className={tab === "catalog" ? "active" : ""}
          onClick={() => setTab("catalog")}
        >
          Catálogo da atividade
        </button>
      </div>
      {feedback && (
        <div className="notice" role="status">
          {feedback}
        </div>
      )}
      {tab === "catalog" ? (
        <PriceCatalog
          data={data}
          onChange={onChange}
          initialCategory={category}
        />
      ) : !activity ? (
        <section className="panel">
          <Empty>
            Você ainda não tem atividades nesta categoria. Crie uma para
            começar.
          </Empty>
          <div className="centered">
            <button className="button button-primary" onClick={create}>
              <Plus size={16} /> Criar atividade
            </button>
          </div>
        </section>
      ) : (
        <>
          <div className="sim-selector">
            <label className="field">
              Atividade configurada
              <select
                value={activity.id}
                onChange={(e) => setSelected(e.target.value)}
              >
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <span className="badge badge-purple">Cenário {scenario.name}</span>
            <span className="muted">
              Alterações salvas automaticamente neste navegador
            </span>
          </div>
          {!result.valid && (
            <div className="notice error-notice" role="alert">
              <TriangleAlert size={18} />
              <div>
                <strong>Revise os parâmetros para simular.</strong>
                {result.errors.map((e) => (
                  <p key={e}>{e}</p>
                ))}
              </div>
            </div>
          )}
          <div className="stat-grid">
            <Metric
              label="Receita bruta / h"
              value={money(result.grossPerHour, c)}
              detail="Antes de custos e taxas"
              icon={<Coins size={18} />}
            />
            <Metric
              label="Custos totais / h"
              value={money(result.costPerHour, c)}
              detail="Operação + taxas de venda"
              icon={<Gauge size={18} />}
              tone="blue"
            />
            <Metric
              label="Lucro líquido / h"
              value={money(result.netPerHour, c)}
              detail={
                <span
                  className={result.netPerHour >= 0 ? "positive" : "negative"}
                >
                  {result.netPerHour >= 0
                    ? "Receita superior aos custos"
                    : "Atividade com prejuízo"}
                </span>
              }
              icon={<TrendingUp size={18} />}
              tone="green"
            />
            <Metric
              label="Payback estimado"
              value={
                result.paybackHours === null
                  ? "Sem retorno"
                  : `${number(result.paybackHours, 1)} h`
              }
              detail="Investimento ÷ lucro líquido por hora"
              icon={<Clock3 size={18} />}
              tone="purple"
            />
          </div>
          {tab === "parameters" ? (
            <div className="sim-grid">
              <section className="panel parameter-panel">
                <div className="panel-header">
                  <div>
                    <h2>Parâmetros de produção</h2>
                    <p>Hipóteses editáveis · resultados em tempo real</p>
                  </div>
                  <span className="icon-box">
                    <Calculator size={18} />
                  </span>
                </div>
                <div className="form-content">
                  <div className="form-grid">
                    <label className="field">
                      Nome da atividade
                      <input
                        maxLength={100}
                        value={activity.name}
                        onChange={(e) => update({ name: e.target.value })}
                      />
                    </label>
                    <label className="field">
                      Recurso principal
                      <select
                        value={activity.itemId}
                        onChange={(e) => update({ itemId: e.target.value })}
                      >
                        {data.items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      {category === "spawners"
                        ? "Tipo de mob / equipamento"
                        : category === "fishing"
                          ? "Vara / equipamento"
                          : category === "farming"
                            ? "Equipamento / método"
                            : "Ferramenta / método"}
                      <input
                        value={activity.tool}
                        onChange={(e) => update({ tool: e.target.value })}
                      />
                    </label>
                    <label className="field">
                      Encantamentos / modificadores
                      <input
                        value={activity.enchants}
                        onChange={(e) => update({ enchants: e.target.value })}
                      />
                    </label>
                  </div>
                  <p className="input-hint">
                    Equipamentos e encantamentos são descritivos. Informe seus
                    efeitos observados na eficiência, duração e drops abaixo.
                  </p>
                  <div className="form-divider" />
                  <h3>Ritmo e rendimento</h3>
                  <div className="form-grid three-fields">
                    {(category === "farming" || category === "spawners") && (
                      <Numeric
                        label={
                          category === "farming"
                            ? "Área plantada (blocos)"
                            : "Quantidade de spawners"
                        }
                        value={activity.unitsPerCycle ?? 1}
                        onChange={(n) => update({ unitsPerCycle: n })}
                      />
                    )}
                    <Numeric
                      label={
                        category === "farming"
                          ? "Crescimento + colheita (s)"
                          : category === "spawners"
                            ? "Geração + coleta por ciclo (s)"
                            : "Duração completa do ciclo (s)"
                      }
                      value={activity.cycleSeconds}
                      min={0.01}
                      onChange={(n) => update({ cycleSeconds: n })}
                    />
                    <Numeric
                      label={
                        category === "farming"
                          ? "Colheitas por bloco / ciclo"
                          : category === "spawners"
                            ? "Mobs por spawner / ciclo"
                            : category === "fishing"
                              ? "Tentativas por ciclo"
                              : "Blocos / ações por ciclo"
                      }
                      value={activity.attemptsPerCycle}
                      onChange={(n) => update({ attemptsPerCycle: n })}
                    />
                    <Numeric
                      label="Drops médios por sucesso"
                      value={activity.dropsPerAttempt}
                      disabled={!!activity.outputs?.length}
                      onChange={(n) => update({ dropsPerAttempt: n })}
                    />
                    <Numeric
                      label="Probabilidade de sucesso (%)"
                      value={activity.dropProbability * 100}
                      max={100}
                      disabled={!!activity.outputs?.length}
                      onChange={(n) => update({ dropProbability: n / 100 })}
                    />
                    <Numeric
                      label={
                        category === "spawners"
                          ? "Eficiência de abate (%)"
                          : "Eficiência de coleta (%)"
                      }
                      value={activity.efficiency * 100}
                      max={100}
                      onChange={(n) => update({ efficiency: n / 100 })}
                    />
                    <Numeric
                      label="Tempo efetivamente produtivo (%)"
                      value={activity.productiveFraction * 100}
                      max={100}
                      onChange={(n) => update({ productiveFraction: n / 100 })}
                    />
                  </div>
                  <div className="form-divider" />
                  <div className="subsection-heading">
                    <div>
                      <h3>Distribuição dos drops</h3>
                      <p className="muted">
                        {activity.outputs?.length
                          ? "Saídas adicionais substituem o drop simples acima."
                          : "Opcional: modele capturas e múltiplos drops."}
                      </p>
                    </div>
                    <button
                      className="button button-small"
                      onClick={() =>
                        update({
                          outputs: [
                            ...(activity.outputs ?? []),
                            {
                              itemId: activity.itemId,
                              probability: activity.outputs?.length
                                ? 0
                                : activity.dropProbability,
                              dropsPerAttempt: activity.dropsPerAttempt,
                            },
                          ],
                          outputMode:
                            activity.outputMode ??
                            (category === "fishing"
                              ? "exclusive"
                              : "independent"),
                        })
                      }
                    >
                      <Plus size={14} /> Saída
                    </button>
                  </div>
                  {!!activity.outputs?.length && (
                    <>
                      <label className="field">
                        Modelo de probabilidades
                        <select
                          value={activity.outputMode ?? "independent"}
                          onChange={(e) =>
                            update({
                              outputMode: e.target.value as
                                | "exclusive"
                                | "independent",
                            })
                          }
                        >
                          <option value="exclusive">
                            Categorias exclusivas (soma até 100%)
                          </option>
                          <option value="independent">
                            Drops independentes (podem ocorrer juntos)
                          </option>
                        </select>
                      </label>
                      {activity.outputs.map((o, index) => (
                        <div className="drop-row" key={index}>
                          <label className="field">
                            Recurso
                            <select
                              aria-label={`Recurso da saída ${index + 1}`}
                              value={o.itemId}
                              onChange={(e) =>
                                update({
                                  outputs: activity.outputs!.map((v, j) =>
                                    j === index
                                      ? { ...v, itemId: e.target.value }
                                      : v,
                                  ),
                                })
                              }
                            >
                              {data.items.map((i) => (
                                <option key={i.id} value={i.id}>
                                  {i.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <Numeric
                            label="Chance (%)"
                            value={o.probability * 100}
                            max={100}
                            onChange={(n) =>
                              update({
                                outputs: activity.outputs!.map((v, j) =>
                                  j === index
                                    ? { ...v, probability: n / 100 }
                                    : v,
                                ),
                              })
                            }
                          />
                          <Numeric
                            label="Drops / sucesso"
                            value={o.dropsPerAttempt}
                            onChange={(n) =>
                              update({
                                outputs: activity.outputs!.map((v, j) =>
                                  j === index
                                    ? { ...v, dropsPerAttempt: n }
                                    : v,
                                ),
                              })
                            }
                          />
                          <button
                            className="icon-button"
                            aria-label={`Remover saída ${index + 1}`}
                            onClick={() =>
                              update({
                                outputs: activity.outputs!.filter(
                                  (_, j) => j !== index,
                                ),
                              })
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                  <div className="form-divider" />
                  <h3>Investimento e despesas</h3>
                  <div className="form-grid">
                    <Numeric
                      label={`Investimento inicial (${c})`}
                      value={activity.investment}
                      onChange={(n) => update({ investment: n })}
                    />
                    <Numeric
                      label={`Custo por ciclo (${c})`}
                      value={activity.costPerCycle}
                      onChange={(n) => update({ costPerCycle: n })}
                    />
                    <Numeric
                      label={`Custo fixo por hora (${c})`}
                      value={activity.hourlyCost}
                      onChange={(n) => update({ hourlyCost: n })}
                    />
                    <Numeric
                      label="Taxa sobre as vendas (%)"
                      value={activity.saleFee * 100}
                      max={100}
                      onChange={(n) => update({ saleFee: n / 100 })}
                    />
                  </div>
                  <p className="input-hint">
                    Informe o custo de toda a operação, considerando a área ou
                    todos os spawners. Inclua replantio, matéria-prima e
                    combustível no custo por ciclo; reparos e desgaste das
                    ferramentas no custo por hora. Evite contar a mesma despesa
                    duas vezes.
                  </p>
                  <label className="field">
                    Hipóteses e observações
                    <textarea
                      rows={3}
                      value={activity.notes}
                      onChange={(e) => update({ notes: e.target.value })}
                    />
                  </label>
                  <div className="form-footer">
                    <span>
                      <Save size={14} /> Persistência local automática
                    </span>
                    <button
                      className="text-button negative"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Excluir a atividade “${activity.name}”?`,
                          )
                        ) {
                          onChange({
                            ...data,
                            activities: data.activities.filter(
                              (a) => a.id !== activity.id,
                            ),
                          });
                          setSelected("");
                        }
                      }}
                    >
                      <Trash2 size={14} /> Excluir atividade
                    </button>
                  </div>
                </div>
              </section>
              <aside className="sim-aside">
                <section className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Resumo da simulação</h2>
                      <p>Preços planejados · {scenario.name}</p>
                    </div>
                  </div>
                  <div className="result-details">
                    <div>
                      <span>Ciclos por hora</span>
                      <strong>{number(result.cyclesPerHour, 2)}</strong>
                    </div>
                    <div>
                      <span>Drops médios por ciclo</span>
                      <strong>{number(result.dropsPerCycle, 2)}</strong>
                    </div>
                    <div>
                      <span>Receita por ciclo</span>
                      <strong>{money(result.grossPerCycle, c)}</strong>
                    </div>
                    <div>
                      <span>Drops por hora</span>
                      <strong>{number(result.dropsPerHour, 2)}</strong>
                    </div>
                    <div>
                      <span>Valor esperado por tentativa</span>
                      <strong>{money(result.expectedDropValue, c)}</strong>
                    </div>
                    <div>
                      <span>Receita bruta</span>
                      <strong>{money(result.grossPerHour, c)}</strong>
                    </div>
                    <div>
                      <span>Custos e taxas</span>
                      <strong className="negative">
                        − {money(result.costPerHour, c)}
                      </strong>
                    </div>
                    <div className="result-total">
                      <span>Lucro líquido / h</span>
                      <strong
                        className={
                          result.netPerHour >= 0 ? "positive" : "negative"
                        }
                      >
                        {money(result.netPerHour, c)}
                      </strong>
                    </div>
                  </div>
                  <button
                    className="button full-width"
                    onClick={() => setTab("results")}
                  >
                    Explorar resultados <ArrowRight size={15} />
                  </button>
                </section>
                <section className="panel formula-card">
                  <span className="badge badge-orange">COMO CALCULAMOS</span>
                  <h3>Uma fórmula. Todos os módulos.</h3>
                  <p>Ciclos/h = 3.600 ÷ duração × fração produtiva.</p>
                  <p>
                    Drops/h = ciclos × unidades × ações/unidade × drops médios ×
                    probabilidade × eficiência × cenário.
                  </p>
                  <p>
                    Lucro/h = receita de venda − custos por ciclo − custos fixos
                    − taxas.
                  </p>
                  <p>
                    O multiplicador de custos atua nas despesas de operação; a
                    taxa incide sobre a receita.
                  </p>
                </section>
              </aside>
            </div>
          ) : (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Atual × planejado</h2>
                  <p>Mesma produção e cenário, preços diferentes</p>
                </div>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>INDICADOR</th>
                      <th>PREÇO ATUAL</th>
                      <th>PREÇO PLANEJADO</th>
                      <th>DIFERENÇA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        label: "Receita bruta / h",
                        a: current.grossPerHour,
                        b: result.grossPerHour,
                      },
                      {
                        label: "Custos totais / h",
                        a: current.costPerHour,
                        b: result.costPerHour,
                      },
                      {
                        label: "Lucro líquido / h",
                        a: current.netPerHour,
                        b: result.netPerHour,
                      },
                      {
                        label: "Lucro em 24 h de operação",
                        a: current.profit24h,
                        b: result.profit24h,
                      },
                      {
                        label: `Lucro em 7 dias (${data.settings.hoursPerDay} h/dia)`,
                        a: projectProfit(current, data.settings.hoursPerDay, 7),
                        b: projectProfit(result, data.settings.hoursPerDay, 7),
                      },
                      {
                        label: `Lucro em 30 dias (${data.settings.hoursPerDay} h/dia)`,
                        a: projectProfit(
                          current,
                          data.settings.hoursPerDay,
                          30,
                        ),
                        b: projectProfit(result, data.settings.hoursPerDay, 30),
                      },
                    ].map((row) => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        <td>{money(row.a, c)}</td>
                        <td>{money(row.b, c)}</td>
                        <td
                          className={row.b >= row.a ? "positive" : "negative"}
                        >
                          {money(row.b - row.a, c)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="notice">
                Lucro operacional antes de descontar o investimento inicial. ROI
                por hora:{" "}
                {result.roiPercent === null
                  ? "Não aplicável (sem investimento)"
                  : `${number(result.roiPercent, 2)}%`}
                . Payback só existe quando há lucro positivo. {activity.notes}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
function Numeric({
  label,
  value,
  onChange,
  min = 0,
  max,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        disabled={disabled}
        step="any"
        value={Number.isFinite(value) ? Number(value.toFixed(6)) : 0}
        onChange={(e) => {
          if (e.target.value !== "" && Number.isFinite(Number(e.target.value)))
            onChange(Number(e.target.value));
        }}
      />
    </label>
  );
}
