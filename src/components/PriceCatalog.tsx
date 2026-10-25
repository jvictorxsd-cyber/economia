import { useState } from "react";
import {
  ArrowDownUp,
  Download,
  Plus,
  Search,
  X,
  Package,
  ArrowRightLeft,
  TrendingUp,
  Filter,
} from "lucide-react";
import type { AppData, Category, PriceItem } from "../domain/types";
import { categoryLabels } from "../domain/types";
import { calculatePriceChange } from "../domain/economics";
import { filterAndSortItems, paginate } from "../domain/catalog";
import { money, number, percent, downloadCSV } from "../lib/format";
import { Empty, Pagination, Metric } from "./Shared";
export default function PriceCatalog({
  data,
  onChange,
  comparison = false,
  initialCategory = "all",
  initialQuery = "",
}: {
  data: AppData;
  onChange: (data: AppData) => void;
  comparison?: boolean;
  initialCategory?: Category | "all";
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<Category | "all">(initialCategory);
  const [sort, setSort] = useState<
    "name" | "currentPrice" | "plannedPrice" | "change"
  >("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [adding, setAdding] = useState(false);
  const items = filterAndSortItems(
    data.items,
    query,
    category,
    sort,
    direction,
  );
  const pagination = paginate(items, page, pageSize);
  const currency = data.settings.currency;
  const currentTotal = items.reduce((s, i) => s + i.currentPrice, 0),
    plannedTotal = items.reduce((s, i) => s + i.plannedPrice, 0);
  const delta = calculatePriceChange(currentTotal, plannedTotal);
  function updatePrice(
    id: string,
    key: "currentPrice" | "plannedPrice",
    value: string,
  ) {
    const n = Number(value);
    if (value !== "" && Number.isFinite(n) && n >= 0)
      onChange({
        ...data,
        items: data.items.map((i) => (i.id === id ? { ...i, [key]: n } : i)),
      });
  }
  const exportRows = () =>
    downloadCSV(
      comparison ? "comparacao-de-precos.csv" : "catalogo-de-precos.csv",
      [
        "Item",
        "Categoria",
        "Unidade",
        "Preço atual",
        "Preço planejado",
        "Diferença",
        "Variação (%)",
      ],
      items.map((i) => {
        const d = calculatePriceChange(i.currentPrice, i.plannedPrice);
        return [
          i.name,
          categoryLabels[i.category],
          i.unit,
          i.currentPrice,
          i.plannedPrice,
          d.absolute,
          d.percent,
        ];
      }),
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {comparison
              ? "DECISÕES COM PERSPECTIVA"
              : "CADA RECURSO TEM SEU VALOR"}
          </div>
          <h1>{comparison ? "Comparador de preços" : "Catálogo de preços"}</h1>
          <p>
            {comparison
              ? "Entenda o impacto das mudanças antes de aplicá-las."
              : "Pesquise, organize e ajuste a economia do seu servidor."}
          </p>
        </div>
        <div className="button-row">
          <button className="button" onClick={exportRows}>
            <Download size={16} /> Exportar CSV
          </button>
          <button
            className="button button-primary"
            onClick={() => setAdding(true)}
          >
            <Plus size={16} /> Novo item
          </button>
        </div>
      </div>
      <div className="stat-grid three">
        <Metric
          label="Itens no filtro"
          value={String(items.length)}
          detail="Catálogo demonstrativo e personalizável"
          icon={<Package size={18} />}
        />
        <Metric
          label="Cesta de preços atuais"
          value={money(currentTotal, currency)}
          detail="Uma unidade de cada item do filtro"
          icon={<ArrowRightLeft size={18} />}
          tone="blue"
        />
        <Metric
          label="Variação da cesta planejada"
          value={percent(delta.percent)}
          detail={
            <>{money(delta.absolute, currency)} em relação à cesta atual</>
          }
          icon={<TrendingUp size={18} />}
          tone="green"
        />
      </div>
      {comparison && (
        <div className="insight-grid">
          <div className="panel insight">
            <h3>Índice ilustrativo de preços</h3>
            <strong
              className={delta.absolute >= 0 ? "orange-text" : "positive"}
            >
              {percent(delta.percent)}
            </strong>
            <p>
              Cesta não ponderada: soma de uma unidade por item. Não mede a
              inflação real sem volumes e histórico de transações.
            </p>
          </div>
          <div className="panel insight">
            <h3>Oferta e demanda</h3>
            <p>
              Maior preço de venda pode incentivar produção e entrada de moeda.
              Menor preço pode reduzir esse incentivo. A resposta depende das
              regras e do comportamento dos jogadores.
            </p>
          </div>
          <div className="panel insight">
            <h3>Equilíbrio econômico</h3>
            <p>
              Compare lucro por hora e custos antes de mudar os preços.
              Estoques, concorrência, compra pela loja e sumidouros de moeda não
              são modelados automaticamente.
            </p>
          </div>
        </div>
      )}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{comparison ? "Atual × planejado" : "Tabela de recursos"}</h2>
            <p>
              Preços por unidade · edite os campos para recalcular os
              simuladores
            </p>
          </div>
          <span className="badge badge-orange">Dados de exemplo</span>
        </div>
        <div className="table-toolbar">
          <label className="search-input">
            <Search size={17} />
            <input
              placeholder="Buscar item ou recurso..."
              aria-label="Buscar item"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <div className="toolbar-filters">
            <label className="select-wrap">
              <Filter size={15} />
              <select
                aria-label="Categoria"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as Category | "all");
                  setPage(1);
                }}
              >
                <option value="all">Todas as categorias</option>
                {Object.entries(categoryLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <select
              aria-label="Ordenar por"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as typeof sort);
                setPage(1);
              }}
            >
              <option value="name">Nome do item</option>
              <option value="currentPrice">Preço atual</option>
              <option value="plannedPrice">Preço planejado</option>
              <option value="change">Variação percentual</option>
            </select>
            <button
              className="icon-button"
              aria-label="Inverter ordenação"
              title={direction === "asc" ? "Crescente" : "Decrescente"}
              onClick={() => setDirection(direction === "asc" ? "desc" : "asc")}
            >
              <ArrowDownUp size={16} />
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table price-table">
            <thead>
              <tr>
                <th>ITEM / RECURSO</th>
                <th>CATEGORIA</th>
                <th>PREÇO ATUAL ({currency})</th>
                <th>PLANEJADO ({currency})</th>
                <th>DIFERENÇA</th>
                <th>VARIAÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {pagination.rows.map((item) => {
                const change = calculatePriceChange(
                  item.currentPrice,
                  item.plannedPrice,
                );
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="item-cell">
                        <span className="item-emoji">{item.icon}</span>
                        <div>
                          <strong>{item.name}</strong>
                          <small>por {item.unit}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`category-label ${item.category}`}>
                        {categoryLabels[item.category]}
                      </span>
                    </td>
                    <td>
                      <input
                        className="price-input"
                        type="number"
                        step="0.01"
                        min="0"
                        max="1000000000"
                        aria-label={`Preço atual de ${item.name}`}
                        value={item.currentPrice}
                        onChange={(e) =>
                          updatePrice(item.id, "currentPrice", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="price-input planned-input"
                        type="number"
                        step="0.01"
                        min="0"
                        max="1000000000"
                        aria-label={`Preço planejado de ${item.name}`}
                        value={item.plannedPrice}
                        onChange={(e) =>
                          updatePrice(item.id, "plannedPrice", e.target.value)
                        }
                      />
                    </td>
                    <td
                      className={change.absolute >= 0 ? "positive" : "negative"}
                    >
                      {money(change.absolute, currency)}
                    </td>
                    <td>
                      <span
                        className={`badge ${change.absolute > 0 ? "badge-green" : change.absolute < 0 ? "badge-red" : "badge-neutral"}`}
                      >
                        {percent(change.percent)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={2}>Cesta do filtro · {items.length} itens</td>
                  <td>{money(currentTotal, currency)}</td>
                  <td>{money(plannedTotal, currency)}</td>
                  <td>{money(delta.absolute, currency)}</td>
                  <td>{percent(delta.percent)}</td>
                </tr>
              </tfoot>
            )}
          </table>
          {items.length === 0 && <Empty />}
        </div>
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pageSize}
          onPage={setPage}
          onSize={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </section>
      <div className="notice">
        Os totais consideram todos os itens filtrados, inclusive os de outras
        páginas. “Sem base” indica preço atual zero. Os preços são hipóteses
        configuradas por você.
      </div>
      {adding && (
        <AddItem
          data={data}
          onChange={onChange}
          close={() => setAdding(false)}
        />
      )}
    </>
  );
}
function AddItem({
  data,
  onChange,
  close,
}: {
  data: AppData;
  onChange: (d: AppData) => void;
  close: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("other");
  const [current, setCurrent] = useState("0");
  const [planned, setPlanned] = useState("0");
  const [error, setError] = useState("");
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-item-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <h2 id="new-item-title">Adicionar recurso</h2>
          <button className="icon-button" aria-label="Fechar" onClick={close}>
            <X size={18} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (
              !name.trim() ||
              !Number.isFinite(Number(current)) ||
              !Number.isFinite(Number(planned)) ||
              Number(current) < 0 ||
              Number(planned) < 0
            ) {
              setError(
                "Informe um nome e preços válidos, iguais ou maiores que zero.",
              );
              return;
            }
            const item: PriceItem = {
              id: crypto.randomUUID(),
              name: name.trim(),
              category,
              currentPrice: Number(current),
              plannedPrice: Number(planned),
              unit: "unidade",
              icon: "📦",
            };
            onChange({ ...data, items: [...data.items, item] });
            close();
          }}
        >
          <label className="field">
            Nome do item
            <input
              autoFocus
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field">
            Categoria
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {Object.entries(categoryLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label className="field">
              Preço atual
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </label>
            <label className="field">
              Preço planejado
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={planned}
                onChange={(e) => setPlanned(e.target.value)}
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="negative">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button type="button" className="button" onClick={close}>
              Cancelar
            </button>
            <button className="button button-primary">Adicionar item</button>
          </div>
        </form>
      </section>
    </div>
  );
}
