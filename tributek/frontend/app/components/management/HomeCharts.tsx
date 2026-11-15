"use client"

import { useState } from "react"
import Link from "next/link"
import { money } from "../ficha/model"
import { periodLabel, type Ledger } from "./model"
import { homeChartData } from "./homeChartData"
import "./home-charts.css"

export default function HomeCharts({ data, period, hidden, loading, failed, featuredId, featuredName }: {
  data: Ledger
  period: string
  hidden: boolean
  loading: boolean
  failed: boolean
  featuredId?: string
  featuredName?: string
}) {
  const [onlyFeatured, setOnlyFeatured] = useState(false)
  const selectedId = onlyFeatured && featuredId ? featuredId : ""
  const { months, states } = homeChartData(data, period, selectedId)
  const max = Math.max(1, ...months.flatMap(m => [m.collected, m.pending]))
  const hasMovements = months.some(m => m.collected || m.pending)
  const statusRows = [
    { label: "Sin abonos", value: states.unpaid, tone: "coral" },
    { label: "Pago parcial", value: states.partial, tone: "amber" },
    { label: "Pagado", value: states.paid, tone: "green" },
  ]
  const total = states.unpaid + states.partial + states.paid
  const unavailable = loading ? "Cargando gráficos…" : failed ? "No se pudieron cargar los gráficos. Reintenta la consulta de datos." : ""
  return <section className="tk-home-charts" aria-label="Gráficos de gestión">
    <div className="tk-chart-heading">
      <div><h2>Gestión en cifras</h2><p>{selectedId ? featuredName : "Todos los clientes"} · {periodLabel(period)}</p></div>
      <label className="tk-field"><span>Clientes en los gráficos</span><select value={selectedId ? "featured" : "all"} onChange={e => setOnlyFeatured(e.target.value === "featured")}>
        <option value="all">Todos los clientes</option><option value="featured" disabled={!featuredId}>Cliente destacado</option>
      </select></label>
    </div>
    {unavailable ? <p role="status" className="tk-empty">{unavailable}</p> : <div className="tk-chart-grid">
      <article className="tk-chart-card tk-chart-cash">
        <h3>Cobros y saldos por mes</h3>
        <p className="tk-chart-caption">Últimos seis meses hasta {periodLabel(period)}.</p>
        <div className="tk-chart-legend"><span><i className="green" />Cobros registrados</span><span><i className="amber" />Saldo pendiente</span></div>
        {hidden ? <p className="tk-empty">Montos ocultos</p> : !hasMovements ? <p className="tk-empty">Sin movimientos en este período.</p> : <div className="tk-chart-months">
          {months.map(m => <div className="tk-chart-month" key={m.period}>
            <span className="tk-chart-month-label">{periodLabel(m.period)}</span>
            <div className="tk-chart-series">
              {[{ label: "Cobros registrados", value: m.collected, tone: "green" }, { label: "Saldo pendiente", value: m.pending, tone: "amber" }].map(row => <div className="tk-chart-bar-row" key={row.tone}>
                <span className="tk-chart-track" aria-hidden="true"><span className={`tk-chart-fill ${row.tone}`} style={{ width: `${row.value / max * 100}%` }} /></span>
                <span className="tk-chart-amount"><span className="sr-only">{row.label}: </span>{money(row.value)}</span>
              </div>)}
            </div>
          </div>)}
        </div>}
        <p className="tk-chart-note">Servicios y reembolsos. Cobros por fecha de recepción y saldos actuales del mes de origen. Excluye pagos a instituciones. No representa utilidad ni un saldo histórico.</p>
      </article>
      <article className="tk-chart-card tk-chart-status">
        <h3>Estado de cobro</h3>
        <p className="tk-chart-caption">Registros mensuales de servicios y reembolsos.</p>
        {!total ? <p className="tk-empty">Sin obligaciones cobrables en este período.</p> : <div className="tk-chart-states">
          {statusRows.map(row => <div key={row.tone}>
            <div className="tk-chart-state-label"><span><i className={row.tone} />{row.label}</span><strong>{row.value}</strong></div>
            <div className="tk-chart-track" aria-hidden="true"><span className={`tk-chart-fill ${row.tone}`} style={{ width: `${row.value / total * 100}%` }} /></div>
          </div>)}
        </div>}
        <p className="tk-chart-note">No incluye meses sin cargos. Las postergaciones se controlan por separado.</p>
        <Link className="tk-button" href={`/admin/obligaciones?period=${period}`}>Ver obligaciones del período</Link>
      </article>
    </div>}
  </section>
}
