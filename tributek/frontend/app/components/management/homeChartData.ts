import { receivables } from "../ficha/model"
import { balance, receivedByCategory, type Ledger } from "./model"

/** Cobros por fecha de recepción y saldos actuales de cada período de origen. */
export function homeChartData(data: Ledger, period: string, clientId = "") {
  const scoped = clientId ? {
    ...data,
    months: data.months.filter(m => m.clientId === clientId),
    payments: data.payments.filter(p => p.clientId === clientId),
  } : data
  const [year, month] = period.split("-").map(Number)
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(year, month - 6 + index, 15)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    const received = receivedByCategory(scoped, key)
    const pending = scoped.months.filter(m => m.period === key).reduce((sum, m) =>
      sum + receivables.reduce((total, concept) => total + Math.max(0, balance(scoped, m, concept)), 0), 0)
    return { period: key, collected: received.services + received.reimbursements, pending }
  })
  const states = { unpaid: 0, partial: 0, paid: 0 }
  for (const m of scoped.months.filter(m => m.period === period)) {
    const pending = receivables.reduce((sum, concept) => sum + Math.max(0, balance(scoped, m, concept)), 0)
    const received = scoped.payments.filter(p => p.clientId === m.clientId && p.period === period && receivables.includes(p.concept) && !p.deferredId && p.destination !== "institution").reduce((sum, p) => sum + p.amount, 0)
    const amount = receivables.reduce((sum, concept) => sum + m.amounts[concept], 0)
    // Los meses sin cargos y los saldos íntegramente postergados no son pagos completados.
    if (pending > 0) states[received > 0 ? "partial" : "unpaid"] += 1
    else if (amount > 0 && received > 0) states.paid += 1
  }
  return { months, states }
}
