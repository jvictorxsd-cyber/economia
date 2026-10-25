import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import type { ReactNode } from "react";
export function Empty({
  children = "Nenhum resultado encontrado. Tente outros filtros.",
}: {
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Inbox size={30} />
      <p>{children}</p>
    </div>
  );
}
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  onSize,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  onSize: (s: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        {total === 0
          ? "0"
          : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}`}{" "}
        de {total} registros
      </span>
      <div>
        <label>
          Por página{" "}
          <select
            aria-label="Registros por página"
            value={pageSize}
            onChange={(e) => onSize(Number(e.target.value))}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <button
          className="icon-button"
          aria-label="Página anterior"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft size={16} />
        </button>
        <span>
          {page} / {Math.max(1, totalPages)}
        </span>
        <button
          className="icon-button"
          aria-label="Próxima página"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
export function Metric({
  label,
  value,
  detail,
  icon,
  tone = "orange",
}: {
  label: string;
  value: string;
  detail: ReactNode;
  icon: ReactNode;
  tone?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`metric-icon ${tone}`}>{icon}</span>
      </div>
      <strong>{value}</strong>
      <div className="stat-detail">{detail}</div>
    </div>
  );
}
