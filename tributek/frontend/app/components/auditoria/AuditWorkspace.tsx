/**
 * Interfaz AuditWorkspace. Las funciones de este archivo separan la presentación de sus acciones y estados; los comentarios siguientes describen cada responsabilidad.
 */
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { authenticatedFetch } from "@/app/features/auth/auth-client";
import Icon from "../ui/Icon";
import AdminUser from "../layout/AdminUser";
import {
  actions,
  entities,
  label,
  parsePage,
  dateLabel,
  AUDIT_PAGE_SIZE,
  type AuditEntry,
  type AuditPage,
} from "./model";
import "./auditoria.css";

type Filters = {
  periodo: 'reciente' | 'personalizado' | 'todo'
  buscar: string;
  entidad: string;
  accion: string;
  desde: string;
  hasta: string;
};
const empty: Filters = { periodo: "reciente", buscar: "", entidad: "", accion: "", desde: "", hasta: "" }
type Result = { key: string; data?: AuditPage; error?: string };

/** Coordina historial, paginación y filtros; separa los filtros en edición de los aplicados. */
export default function AuditWorkspace() {
  const [draft, setDraft] = useState(empty);
  const [filters, setFilters] = useState(empty);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null);
  const params = new URLSearchParams({
    pagina: String(page),
    limite: String(AUDIT_PAGE_SIZE),
    ...filters,
  }).toString();
  const key = `${params}&refresh=${refresh}`;
  const current = result?.key === key ? result : null;
  const loading = !current;
  const data = current?.data;
  const periodLabel = filters.periodo === "reciente" ? "Últimos 30 días" : filters.periodo === "todo" ? "Todo el historial" : "Fechas personalizadas"
  const filterError = draft.periodo === "personalizado" && !draft.desde && !draft.hasta
    ? "Indica al menos una fecha para consultar ese período."
    : draft.desde && draft.hasta && draft.desde > draft.hasta
      ? "La fecha desde no puede ser posterior a hasta."
      : ""

  useEffect(() => {
    const controller = new AbortController();
    /** Consulta el historial autenticado y permite cancelar la solicitud. */
    async function load() {
      try {
        const response = await authenticatedFetch(`/auditoria?${params}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          const message =
            response.status === 401
              ? "Tu sesión venció. Vuelve a iniciar sesión."
              : response.status === 403
                ? "No tienes permiso para consultar este historial."
                : [404, 501].includes(response.status)
                  ? "El historial aún no está habilitado. Inténtalo cuando se complete su conexión."
                  : "No se pudo consultar el historial. Inténtalo nuevamente.";
          throw new Error(message);
        }
        const parsed = parsePage(await response.json());
        if (!controller.signal.aborted) setResult({ key, data: parsed });
      } catch (error) {
        if (!controller.signal.aborted)
          setResult({
            key,
            error:
              error instanceof Error
                ? error.message
                : "No se pudo conectar con el historial.",
          });
      }
    }
    void load();
    return () => controller.abort();
  }, [key, params]);

  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);

  /** Aplica filtros y vuelve a la primera página. */
  function apply(event: FormEvent) {
    event.preventDefault();
    if (filterError) {
      setAdvancedOpen(true)
      return
    }
    setFilters({ ...draft, buscar: draft.buscar.trim() });
    setPage(1);
    setRefresh((n) => n + 1);
  }
  /** Limpia filtros y vuelve a cargar la primera página. */
  function reset() {
    setDraft(empty);
    setFilters(empty);
    setPage(1);
    setRefresh((n) => n + 1);
  }
  /** Actualiza un filtro en edición sin ejecutar todavía la búsqueda. */
  function field(name: keyof Filters, value: string) {
    setDraft((previous) => ({ ...previous, [name]: value,
      ...((name === "desde" || name === "hasta") ? { periodo: "personalizado" as const } : {}),
    }))
  }
  return (
    <section className="audit">
      <header className="tk-header audit-heading">
        <div>
          <p className="tk-eyebrow">TRIBUTEK / Gestión</p>
          <h1>Trazabilidad</h1>
          <p className="tk-subtle">
            Consulta quién realizó cada acción y cuándo ocurrió.
          </p>
        </div>
        <div className="audit-header-end">
          <button type="button" onClick={() => setRefresh((n) => n + 1)} disabled={loading}>
            Actualizar historial
          </button>
          <AdminUser />
        </div>
      </header>
      <hr className="tk-header-divider" />
      <form className="audit-filters" onSubmit={apply}>
        <h2 className="tk-filters-title"><Icon name="filter" className="h-4 w-4" />Filtros</h2>
        <div className="audit-search-row">
        <label className="audit-period">
          Período
          <select aria-label="Período" value={draft.periodo} onChange={(event) => {
            const periodo = event.target.value as Filters["periodo"]
            setDraft((previous) => ({ ...previous, periodo, desde: "", hasta: "" }))
            if (periodo === "personalizado") setAdvancedOpen(true)
          }}>
            <option value="reciente">Últimos 30 días</option>
            <option value="todo">Todo el historial</option>
            <option value="personalizado">Fechas personalizadas</option>
          </select>
        </label>
        <label className="audit-search">
          Buscar
          <input
            value={draft.buscar}
            onChange={(e) => field("buscar", e.target.value)}
            maxLength={150}
            placeholder="Usuario, referencia o descripción"
            type="search"
          />
        </label>
        <button type="submit" aria-label="Buscar en trazabilidad"><Icon name="search" className="h-4 w-4" /> Buscar</button>
        </div>
        {filterError && <p className="audit-filter-error" role="status">{filterError}</p>}
        <details className="audit-advanced" open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}>
          <summary>Más filtros{[filters.entidad, filters.accion, filters.desde, filters.hasta].filter(Boolean).length > 0 && <span className="audit-filter-count">{[filters.entidad, filters.accion, filters.desde, filters.hasta].filter(Boolean).length} activos</span>}</summary>
          <div className="audit-filter-fields">
        <label>
          Área
          <select
            value={draft.entidad}
            onChange={(e) => field("entidad", e.target.value)}
          >
            <option value="">Todas las áreas</option>
            {Object.entries(entities).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
        <label>
          Acción
          <select value={draft.accion} onChange={(e) => field("accion", e.target.value)}>
            <option value="">Todas las acciones</option>
            {Object.entries(actions).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
        <label>
          Desde
          <input
            type="date"
            value={draft.desde}
            max={draft.hasta || undefined}
            onChange={(e) => field("desde", e.target.value)}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={draft.hasta}
            min={draft.desde || undefined}
            onChange={(e) => field("hasta", e.target.value)}
          />
        </label>
        <div className="audit-buttons">
          <button className="audit-primary" type="submit">
            Aplicar filtros
          </button>
          <button type="button" onClick={reset}>
            Limpiar
          </button>
        </div>
          </div>
        </details>
      </form>
      <section
        className="audit-records"
        aria-label="Historial de acciones"
        aria-busy={loading}
      >
        <div className="audit-records-title">
          <h2>Historial de acciones</h2>
          <span aria-live="polite">
            {data
              ? `Mostrando ${data.items.length} de ${data.total} registros · ${periodLabel}`
              : loading
                ? "Consultando…"
                : "Consulta no disponible"}
          </span>
        </div>
        {loading ? (
          <p className="audit-state" role="status">
            Cargando historial…
          </p>
        ) : current?.error ? (
          <div className="audit-state" role="alert">
            <Icon name="shield" />
            <p>{current.error}</p>
            <button type="button" onClick={() => setRefresh((n) => n + 1)}>
              Reintentar
            </button>
          </div>
        ) : data && data.items.length === 0 ? (
          <div className="audit-state">
            <Icon name="search" />
            <h3>No hay acciones para mostrar</h3>
            <p>Prueba con otras fechas o limpia los filtros.</p>
            {page > 1 && (
              <button onClick={() => setPage(1)}>Volver a la primera página</button>
            )}
          </div>
        ) : (
          data && (
            <>
              <div className="audit-table-wrap">
                <table>
                  <caption className="audit-sr">
                    Acciones registradas. Fechas y horas de Chile continental.
                  </caption>
                  <thead>
                    <tr>
                      <th>Fecha y hora</th>
                      <th>Usuario</th>
                      <th>Área</th>
                      <th>Acción</th>
                      <th>Referencia</th>
                      <th>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((row) => (
                      <tr key={row.id}>
                        <td>{dateLabel(row.creadoEn)}</td>
                        <td>
                          {row.usuario?.nombreUsuario || "Sin usuario identificado"}
                        </td>
                        <td>{label(entities, row.entidad)}</td>
                        <td>
                          <span className="audit-tag" data-action={row.accion}>{label(actions, row.accion)}</span>
                        </td>
                        <td>{row.entidadId ? `#${row.entidadId}` : "Sin referencia"}</td>
                        <td>
                          <button
                            type="button"
                            aria-label={`Ver detalle del registro ${row.id}`}
                            onClick={() => setSelected(row)}
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <nav className="audit-pagination" aria-label="Páginas del historial">
                <span>
                  Página {page} de {Math.max(1, Math.ceil(data.total / AUDIT_PAGE_SIZE))}
                </span>
                <div className="audit-buttons">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                    Anterior
                  </button>
                  <button
                    disabled={page * AUDIT_PAGE_SIZE >= data.total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              </nav>
            </>
          )
        )}
      </section>
      <dialog
        ref={dialog}
        className="audit-dialog"
        aria-labelledby="audit-detail-title"
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <div className="audit-heading">
              <h2 id="audit-detail-title">Detalle de la acción</h2>
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                aria-label="Cerrar detalle"
                autoFocus
              >
                <Icon name="close" />
              </button>
            </div>
            <dl>
              <dt>Registro</dt>
              <dd>#{selected.id}</dd>
              <dt>Fecha y hora (Chile)</dt>
              <dd>{dateLabel(selected.creadoEn)}</dd>
              <dt>Usuario</dt>
              <dd>{selected.usuario?.nombreUsuario || "Sin usuario identificado"}</dd>
              <dt>Área</dt>
              <dd>{label(entities, selected.entidad)}</dd>
              <dt>Acción</dt>
              <dd><span className="audit-tag" data-action={selected.accion}>{label(actions, selected.accion)}</span></dd>
              <dt>Referencia</dt>
              <dd>{selected.entidadId ? `#${selected.entidadId}` : "Sin referencia"}</dd>
              <dt>Descripción</dt>
              <dd className="audit-description">
                {selected.detalle || "Sin descripción adicional."}
              </dd>
            </dl>
          </>
        )}
      </dialog>
    </section>
  );
}
