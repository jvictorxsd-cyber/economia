import { useEffect, useState } from "react";
import {
  ArrowDownUp,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Coins,
  Compass,
  FlaskConical,
  Fish,
  Gem,
  LayoutDashboard,
  Menu,
  Package,
  Pickaxe,
  Search,
  Settings2,
  ShieldCheck,
  Skull,
  Sprout,
  TrendingUp,
  X,
} from "lucide-react";
import type { AppData, Category } from "./domain/types";
import { loadData, saveData, validateData } from "./lib/storage";
import Dashboard from "./components/Dashboard";
import PriceCatalog from "./components/PriceCatalog";
import Simulator from "./components/Simulator";
import {
  InvestmentsView,
  ScenariosView,
  ReportsView,
  SettingsView,
} from "./components/AnalysisViews";
const sections = [
  {
    label: "PRINCIPAL",
    items: [
      { id: "dashboard", name: "Visão geral", icon: LayoutDashboard },
      { id: "prices", name: "Tabela de preços", icon: Coins },
      { id: "compare", name: "Comparador de preços", icon: ArrowDownUp },
    ],
  },
  {
    label: "SIMULADORES",
    items: [
      { id: "mining", name: "Mineração", icon: Pickaxe },
      { id: "farming", name: "Plantações", icon: Sprout },
      { id: "fishing", name: "Pesca", icon: Fish },
      { id: "spawners", name: "Spawners", icon: Skull },
      { id: "other", name: "Outras atividades", icon: Compass },
    ],
  },
  {
    label: "PLANEJAMENTO",
    items: [
      { id: "investments", name: "Investimentos", icon: TrendingUp },
      { id: "scenarios", name: "Cenários", icon: FlaskConical },
      { id: "reports", name: "Relatórios", icon: BarChart3 },
      { id: "settings", name: "Configurações", icon: Settings2 },
    ],
  },
];
const pages = sections.flatMap((s) => s.items);
function initialPage() {
  const hash = window.location.hash.slice(1);
  return pages.some((p) => p.id === hash) ? hash : "dashboard";
}
export default function App() {
  const [data, setData] = useState<AppData>(loadData);
  const [page, setPage] = useState(initialPage);
  const [mobile, setMobile] = useState(false);
  const [help, setHelp] = useState(false);
  const [search, setSearch] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  useEffect(() => {
    const handler = () => {
      setPage(initialPage());
      setMobile(false);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  const navigate = (id: string) => {
    setPage(id);
    window.location.hash = id;
    setMobile(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const change = (next: AppData) => {
    setData(next);
    if (!validateData(next))
      setSaveStatus(
        "Há parâmetros inválidos. Corrija-os para salvar suas alterações.",
      );
    else if (!saveData(next))
      setSaveStatus(
        "Não foi possível salvar no navegador. Exporte um backup nas configurações.",
      );
    else setSaveStatus("");
  };
  const scenario =
    data.scenarios.find((s) => s.id === data.settings.scenarioId) ??
    data.scenarios[0];
  const currentPage = pages.find((p) => p.id === page)!;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "is-open" : ""}`}>
        <a
          className="brand"
          href="#dashboard"
          onClick={() => navigate("dashboard")}
          aria-label="Blockonomics, início"
        >
          <span className="brand-icon">
            <Package size={25} />
          </span>
          <div>
            blockonomics<span>MINECRAFT ECONOMY</span>
          </div>
        </a>
        <div className="server-selector">
          <div className="server-avatar">B</div>
          <div>
            <strong>Meu servidor</strong>
            <span>
              <span className="dot orange-bg" /> Ambiente de simulação
            </span>
          </div>
          <button
            className="icon-button"
            aria-label="Configurar servidor"
            onClick={() => navigate("settings")}
          >
            <ChevronDown size={16} />
          </button>
        </div>
        <nav aria-label="Navegação principal">
          {sections.map((section) => (
            <div className="nav-section" key={section.label}>
              <h2>{section.label}</h2>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${page === item.id ? "active" : ""}`}
                  aria-current={page === item.id ? "page" : undefined}
                  onClick={() => navigate(item.id)}
                >
                  <item.icon size={18} />
                  <span>{item.name}</span>
                  {page === item.id && <span className="nav-active-dot" />}
                  {item.id === "prices" && page !== "prices" && (
                    <small>{data.items.length}</small>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-hint">
            <span className="tiny-cube">✦</span>
            <strong>
              Construa uma economia
              <br />
              que faz sentido.
            </strong>
            <p>
              Menos achismo.
              <br />
              Mais estratégia.
            </p>
            <button onClick={() => navigate("scenarios")}>
              Explorar cenários <ChevronRight size={14} />
            </button>
          </div>
          <button
            className="profile-button"
            onClick={() => navigate("settings")}
          >
            <div className="profile-avatar">AD</div>
            <div>
              <strong>Administrador</strong>
              <small>Economia do servidor</small>
            </div>
            <Settings2 size={16} />
          </button>
        </div>
      </aside>
      {mobile && (
        <div className="sidebar-backdrop" onClick={() => setMobile(false)} />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir menu"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb-root">Economia</span>
            <ChevronRight size={14} />
            <span>{currentPage?.name ?? "Visão geral"}</span>
          </div>
          <div className="topbar-right">
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                setCatalogQuery(search);
                navigate("prices");
              }}
            >
              <Search size={16} />
              <input
                aria-label="Buscar no catálogo"
                placeholder="Buscar no catálogo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>↵</kbd>
            </form>
            <span className="topbar-divider" />
            <button
              className="icon-button"
              aria-label="Ajuda e fórmulas"
              onClick={() => setHelp(true)}
            >
              <CircleHelp size={19} />
            </button>
            <button
              className="topbar-avatar"
              aria-label="Abrir configurações"
              onClick={() => navigate("settings")}
            >
              AD
            </button>
          </div>
        </header>
        <main>
          <div className="workspace-topline">
            <div>
              <span className="workspace-square">
                <Gem size={13} />
              </span>{" "}
              WORKSPACE <span>/</span> Meu servidor
            </div>
            <div className="scenario-selector">
              <span className="dot green" />
              <label htmlFor="global-scenario">Cenário</label>
              <select
                id="global-scenario"
                value={scenario.id}
                onChange={(e) =>
                  change({
                    ...data,
                    settings: { ...data.settings, scenarioId: e.target.value },
                  })
                }
              >
                {data.scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {saveStatus && (
            <div className="notice error-notice" role="alert">
              {saveStatus}
            </div>
          )}
          {page === "dashboard" ? (
            <Dashboard data={data} navigate={navigate} />
          ) : page === "prices" || page === "compare" ? (
            <PriceCatalog
              key={page + catalogQuery}
              data={data}
              onChange={change}
              comparison={page === "compare"}
              initialQuery={page === "prices" ? catalogQuery : ""}
            />
          ) : ["mining", "farming", "fishing", "spawners", "other"].includes(
              page,
            ) ? (
            <Simulator
              key={page}
              data={data}
              onChange={change}
              category={page as Category}
            />
          ) : page === "investments" ? (
            <InvestmentsView data={data} onChange={change} />
          ) : page === "scenarios" ? (
            <ScenariosView data={data} onChange={change} />
          ) : page === "reports" ? (
            <ReportsView data={data} onChange={change} />
          ) : (
            <SettingsView data={data} onChange={change} />
          )}
          <footer className="main-footer">
            <span>
              <Package size={13} /> blockonomics{" "}
              <span className="footer-separator">/</span> Sua próxima decisão,
              com mais clareza.
            </span>
            <span>
              <ShieldCheck size={13} />{" "}
              {saveStatus
                ? "Revise a persistência"
                : "Dados locais · sem envio a servidores"}
            </span>
          </footer>
        </main>
      </div>
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            className="modal panel help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header">
              <div>
                <BookOpen size={20} />
                <h2 id="help-title">Como usar o Blockonomics</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Fechar ajuda"
                onClick={() => setHelp(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="form-content">
              <p>1. Ajuste os preços atuais e planejados no catálogo.</p>
              <p>
                2. Configure tempo, produtividade, probabilidades e custos de
                cada atividade nos simuladores.
              </p>
              <p>
                3. Compare cenários e investimentos. Use os relatórios para
                exportar resultados.
              </p>
              <div className="notice">
                Todas as informações iniciais são exemplos. Nenhum dado é lido
                do seu servidor Minecraft.
              </div>
              <h3>Conceitos principais</h3>
              <p>
                <strong>Receita bruta:</strong> valor esperado dos drops
                vendidos.
              </p>
              <p>
                <strong>Lucro líquido:</strong> receita menos custos
                operacionais e taxas.
              </p>
              <p>
                <strong>Payback:</strong> investimento inicial ÷ lucro por hora.
                Não existe retorno finito com lucro nulo ou negativo.
              </p>
              <p>
                <strong>ROI/h:</strong> lucro por hora ÷ investimento × 100. Sem
                investimento, o percentual não se aplica.
              </p>
              <p>
                <strong>Projeções:</strong> 24 h são horas de operação; 7 e 30
                dias respeitam sua jornada diária configurada. Os gráficos
                assumem preço e produção constantes.
              </p>
              <button
                className="button button-primary"
                onClick={() => setHelp(false)}
              >
                Entendi, vamos simular
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
