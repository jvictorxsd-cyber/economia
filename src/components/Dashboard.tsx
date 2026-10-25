import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Clock3,
  Coins,
  Download,
  Pickaxe,
  Sprout,
  Fish,
  Skull,
  Wallet,
  TrendingUp,
  Info,
} from "lucide-react";
import type { AppData } from "../domain/types";
import { calculateActivity, projectProfit } from "../domain/economics";
import { money, number, downloadCSV } from "../lib/format";
import { Metric } from "./Shared";
export default function Dashboard({
  data,
  navigate,
}: {
  data: AppData;
  navigate: (page: string) => void;
}) {
  const scenario =
    data.scenarios.find((s) => s.id === data.settings.scenarioId) ??
    data.scenarios[0];
  const results = data.activities
    .map((a) => ({
      activity: a,
      item: data.items.find((i) => i.id === a.itemId),
      result: calculateActivity(
        a,
        data.items.find((i) => i.id === a.itemId),
        scenario,
        "planned",
        data.items,
      ),
    }))
    .filter((x) => x.result.valid)
    .sort((a, b) => b.result.netPerHour - a.result.netPerHour);
  const top = results[0];
  const r = top?.result;
  const c = data.settings.currency;
  const exportData = () =>
    downloadCSV(
      "visao-economica.csv",
      ["Atividade", "Receita/h", "Custos/h", "Lucro/h", "Payback (h)"],
      results.map((x) => [
        x.activity.name,
        x.result.grossPerHour,
        x.result.costPerHour,
        x.result.netPerHour,
        x.result.paybackHours,
      ]),
    );
  const hours = data.settings.hoursPerDay;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SEU SERVIDOR, EM NÚMEROS</div>
          <h1>
            Visão geral <span className="heading-dot" />
          </h1>
          <p>Acompanhe sua economia. Planeje o próximo bloco.</p>
        </div>
        <button className="button" onClick={exportData}>
          <Download size={16} /> Exportar relatório
        </button>
      </div>
      <div className="demo-banner">
        <div>
          <span className="live-dot" />
          <strong>Modo demonstração</strong>
          <span>
            Dados de exemplo para explorar possibilidades. Nenhuma conexão com
            um servidor real.
          </span>
        </div>
        <button onClick={() => navigate("settings")}>
          Configurar economia <ArrowRight size={15} />
        </button>
      </div>
      <div className="stat-grid dashboard-stats">
        <Metric
          label="Patrimônio total"
          value={money(data.settings.assets + data.settings.balance, c)}
          detail={
            <>
              <span className="small-tag">MANUAL</span> Saldo + ativos
              configurados
            </>
          }
          icon={<Wallet size={18} />}
        />
        <Metric
          label="Saldo disponível"
          value={money(data.settings.balance, c)}
          detail={
            <>
              <span className="dot green" /> Disponível para investir
            </>
          }
          icon={<Coins size={18} />}
          tone="green"
        />
        <Metric
          label="Melhor lucro líquido / h"
          value={money(r?.netPerHour ?? 0, c)}
          detail={
            <>
              <span className="positive">
                <TrendingUp size={13} />
              </span>{" "}
              {top?.activity.name ?? "Nenhuma atividade válida"}
            </>
          }
          icon={<TrendingUp size={18} />}
          tone="purple"
        />
        <Metric
          label="Retorno do investimento"
          value={
            r?.paybackHours != null
              ? `${number(r.paybackHours, 1)} horas`
              : "Sem retorno"
          }
          detail={<>Payback da atividade mais rentável</>}
          icon={<Clock3 size={18} />}
          tone="blue"
        />
      </div>
      <div className="dashboard-main">
        <section className="panel projection-panel">
          <div className="panel-header">
            <div>
              <h2>Projeção de resultados</h2>
              <p>Lucro acumulado · {top?.activity.name ?? "Sem atividade"}</p>
            </div>
            <span className="badge badge-orange">30 dias</span>
          </div>
          <div className="projection-summary">
            <strong>{money(r ? projectProfit(r, hours, 30) : 0, c)}</strong>
            <span>
              <span className="positive">
                <ArrowUpRight size={14} /> {number(hours, 1)} h/dia
              </span>{" "}
              de operação simulada
            </span>
          </div>
          <ProjectionChart
            hourly={r?.netPerHour ?? 0}
            hours={hours}
            currency={c}
            investment={top?.activity.investment ?? 0}
          />
          <div className="chart-legend">
            <span>
              <i className="legend-square orange-bg" /> Lucro operacional
            </span>
            <span>
              <i className="legend-dash" /> Investimento:{" "}
              {money(top?.activity.investment ?? 0, c)}
            </span>
          </div>
          <p className="chart-note">
            Projeção linear, sem reinvestimento. O investimento inicial não é
            descontado da curva.
          </p>
        </section>
        <section className="panel activity-summary">
          <div className="panel-header">
            <div>
              <h2>De onde vem o lucro?</h2>
              <p>Participação no potencial de lucro / h</p>
            </div>
            <ChartNoAxesCombined size={18} className="muted" />
          </div>
          <ActivityDonut results={results} currency={c} />
          <div className="subtle-note">
            <Info size={14} />
            <span>
              Atividades independentes. Participações não representam receitas
              reais.
            </span>
          </div>
        </section>
      </div>
      <div className="section-heading">
        <div>
          <h2>Explore suas atividades</h2>
          <p>Transforme recursos em oportunidades.</p>
        </div>
        <button className="text-button" onClick={() => navigate("investments")}>
          Comparar investimentos <ArrowRight size={15} />
        </button>
      </div>
      <div className="activity-cards">
        {[
          {
            id: "mining",
            name: "Mineração",
            text: "Encontre valor em cada bloco.",
            icon: Pickaxe,
            color: "orange",
          },
          {
            id: "farming",
            name: "Plantações",
            text: "Cultive uma renda consistente.",
            icon: Sprout,
            color: "green",
          },
          {
            id: "fishing",
            name: "Pesca",
            text: "Calcule o valor de cada captura.",
            icon: Fish,
            color: "blue",
          },
          {
            id: "spawners",
            name: "Spawners",
            text: "Automatize seus resultados.",
            icon: Skull,
            color: "purple",
          },
        ].map((x) => {
          const best = results.find((a) => a.activity.category === x.id);
          return (
            <button
              className={`activity-card ${x.color}`}
              key={x.id}
              onClick={() => navigate(x.id)}
            >
              <div className="activity-card-top">
                <span className={`activity-icon ${x.color}`}>
                  <x.icon size={22} />
                </span>
                <ArrowUpRight size={18} />
              </div>
              <h3>{x.name}</h3>
              <p>{x.text}</p>
              <div className="activity-card-bottom">
                <span>Melhor lucro / h</span>
                <strong>{money(best?.result.netPerHour ?? 0, c)}</strong>
              </div>
            </button>
          );
        })}
      </div>
      <section className="panel ranking-panel">
        <div className="panel-header">
          <div>
            <h2>Ranking de rentabilidade</h2>
            <p>
              As atividades com maior lucro por hora no cenário{" "}
              {scenario.name.toLowerCase()}.
            </p>
          </div>
          <button className="text-button" onClick={() => navigate("reports")}>
            Ver relatório <ArrowRight size={15} />
          </button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ATIVIDADE</th>
                <th>RECEITA / H</th>
                <th>CUSTO / H</th>
                <th>LUCRO LÍQUIDO / H</th>
                <th>PAYBACK</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {results.slice(0, 5).map((x, i) => (
                <tr key={x.activity.id}>
                  <td>
                    <div className="item-cell">
                      <span className="rank-number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="item-emoji">{x.item?.icon ?? "📦"}</span>
                      <div>
                        <strong>{x.activity.name}</strong>
                        <small>{x.activity.tool}</small>
                      </div>
                    </div>
                  </td>
                  <td>{money(x.result.grossPerHour, c)}</td>
                  <td className="muted">{money(x.result.costPerHour, c)}</td>
                  <td
                    className={
                      x.result.netPerHour >= 0 ? "positive" : "negative"
                    }
                  >
                    {money(x.result.netPerHour, c)}
                  </td>
                  <td>
                    {x.result.paybackHours === null
                      ? "Sem retorno"
                      : `${number(x.result.paybackHours, 1)} h`}
                  </td>
                  <td>
                    <span
                      className={`badge ${x.result.netPerHour > 0 ? "badge-green" : "badge-red"}`}
                    >
                      <span className="dot" />
                      {x.result.netPerHour > 0 ? "Lucrativo" : "Prejuízo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {results.length === 0 && (
          <p className="empty-state">
            Cadastre uma atividade válida para ver o ranking.
          </p>
        )}
      </section>
      <div className="bottom-tip">
        <span className="tip-icon">✦</span>
        <div>
          <strong>Uma economia saudável começa com boas decisões.</strong>
          <p>
            Compare cenários antes de alterar os preços e descubra o impacto de
            cada mudança.
          </p>
        </div>
        <button
          className="button button-ghost"
          onClick={() => navigate("scenarios")}
        >
          Simular cenários <ArrowRight size={15} />
        </button>
      </div>
    </>
  );
}
function ProjectionChart({
  hourly,
  hours,
  currency,
  investment,
}: {
  hourly: number;
  hours: number;
  currency: string;
  investment: number;
}) {
  const raw = hourly * hours * 30;
  const min = Math.min(raw, 0);
  const max = Math.max(raw, investment, 1) * 1.12;
  const span = max - min;
  const y = (v: number) => 190 - ((v - min) / span) * 160;
  const pts = Array.from(
    { length: 31 },
    (_, i) => `${58 + i * 21.4},${y(hourly * hours * i)}`,
  ).join(" ");
  return (
    <div className="projection-chart">
      <svg
        viewBox="0 0 730 235"
        role="img"
        aria-label={`Projeção linear de lucro para 30 dias: ${money(raw, currency)}`}
      >
        <defs>
          <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fa9944" stopOpacity=".23" />
            <stop offset="100%" stopColor="#fa9944" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <line
              x1="58"
              x2="710"
              y1={30 + (i * 160) / 3}
              y2={30 + (i * 160) / 3}
              stroke="#272c36"
              strokeDasharray="4 5"
            />
            <text x="0" y={34 + (i * 160) / 3} fill="#77808e" fontSize="10">
              {number((max - (span * i) / 3) / 1000, 1)}k
            </text>
          </g>
        ))}
        <polygon
          points={`58,${y(0)} ${pts} 700,${y(0)}`}
          fill="url(#profitFill)"
        />
        <line
          x1="58"
          x2="710"
          y1={y(investment)}
          y2={y(investment)}
          stroke="#c7ad8d"
          strokeDasharray="5 5"
          opacity=".6"
        />
        <polyline
          points={pts}
          fill="none"
          stroke="#fba14a"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {[0, 5, 10, 15, 20, 25, 30].map((d) => (
          <text
            key={d}
            x={58 + d * 21.4}
            y="225"
            textAnchor="middle"
            fill="#7f8794"
            fontSize="10"
          >
            Dia {d === 0 ? "0" : d}
          </text>
        ))}
      </svg>
    </div>
  );
}
function ActivityDonut({
  results,
  currency,
}: {
  results: { activity: { category: string }; result: { netPerHour: number } }[];
  currency: string;
}) {
  const groups = [
    { id: "mining", label: "Mineração", color: "#f7a052" },
    { id: "farming", label: "Plantações", color: "#82c5a4" },
    { id: "fishing", label: "Pesca", color: "#7eace4" },
    { id: "spawners", label: "Spawners", color: "#b29add" },
    { id: "other", label: "Outras", color: "#d4bf7a" },
  ].map((g) => ({
    ...g,
    value: results
      .filter((r) => r.activity.category === g.id)
      .reduce((n, r) => n + Math.max(0, r.result.netPerHour), 0),
  }));
  const total = groups.reduce((s, g) => s + g.value, 0);
  let offset = 0;
  return (
    <>
      <div className="donut-wrap">
        <svg
          viewBox="0 0 180 180"
          role="img"
          aria-label="Distribuição do potencial de lucro por categoria"
        >
          <circle
            cx="90"
            cy="90"
            r="68"
            stroke="#262c35"
            strokeWidth="20"
            fill="none"
          />
          {groups.map((g) => {
            const len = total ? (g.value / total) * 427.26 : 0;
            const el = (
              <circle
                key={g.id}
                cx="90"
                cy="90"
                r="68"
                stroke={g.color}
                strokeWidth="20"
                fill="none"
                strokeDasharray={`${Math.max(0, len - 4)} ${427.26 - Math.max(0, len - 4)}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 90 90)"
              />
            );
            offset += len;
            return el;
          })}
          <text x="90" y="85" textAnchor="middle" fill="#87909d" fontSize="10">
            POTENCIAL / H
          </text>
          <text
            x="90"
            y="108"
            textAnchor="middle"
            fill="#f1f2f4"
            fontSize="19"
            fontWeight="600"
          >
            {currency} {number(total / 1000, 1)}k
          </text>
        </svg>
      </div>
      <div className="donut-legend">
        {groups.map((g) => (
          <div key={g.id}>
            <span>
              <i style={{ background: g.color }} />
              {g.label}
            </span>
            <strong>{number(total ? (g.value / total) * 100 : 0, 1)}%</strong>
          </div>
        ))}
      </div>
    </>
  );
}
