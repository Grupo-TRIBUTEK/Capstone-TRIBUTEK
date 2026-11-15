import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuditoriaService } from './auditoria.service.js'
import type { PrismaService } from '../prisma/prisma.service.js'

function setup() {
  const dates: { operator: string, value: string }[] = []
  const query = {
    where: vi.fn((condition: unknown) => {
      if (typeof condition === 'function') condition({ creadoEn: {
        gte: (value: Temporal.Instant) => dates.push({ operator: 'gte', value: value.toString() }),
        lt: (value: Temporal.Instant) => dates.push({ operator: 'lt', value: value.toString() }),
      } })
      return query
    }),
    include: vi.fn(() => query),
    orderBy: vi.fn(() => query),
    offset: vi.fn(() => query),
    limit: vi.fn(() => query),
    all: vi.fn(async () => []),
    aggregate: vi.fn(async () => ({ total: 480 })),
  }
  const prisma = { db: { orm: { public: { Auditoria: query } } } } as unknown as PrismaService
  return { service: new AuditoriaService(prisma), query, dates }
}
afterEach(() => vi.restoreAllMocks())

describe('Consulta acotada de trazabilidad', () => {
  it('consulta 25 eventos por defecto y conserva el total de coincidencias', async () => {
    const { service, query } = setup()
    expect(await service.listar({})).toEqual({ items: [], total: 480 })
    expect(query.limit).toHaveBeenCalledWith(25)
    expect(query.offset).toHaveBeenCalledWith(0)
  })
  it('calcula los 30 días en Chile, incluso al cambiar el horario de verano', async () => {
    vi.spyOn(Temporal.Now, 'plainDateISO').mockReturnValue(Temporal.PlainDate.from('2026-09-06'))
    const { service, dates } = setup()
    await service.listar({})
    expect(dates).toEqual([
      { operator: 'gte', value: '2026-08-08T04:00:00Z' },
      { operator: 'lt', value: '2026-09-07T03:00:00Z' },
    ])
  })
  it('permite consultar todo el historial explícitamente sin filtro de fechas', async () => {
    const { service, dates, query } = setup()
    await service.listar({ periodo: 'todo', pagina: 2, limite: 25 })
    expect(dates).toEqual([])
    expect(query.offset).toHaveBeenCalledWith(25)
    expect(query.limit).toHaveBeenCalledWith(25)
  })
  it('las fechas explícitas recuperan períodos antiguos sin imponer los 30 días', async () => {
    const { service, dates } = setup()
    await service.listar({ desde: '2025-01-01', hasta: '2025-01-31' })
    expect(dates).toEqual([
      { operator: 'gte', value: '2025-01-01T03:00:00Z' },
      { operator: 'lt', value: '2025-02-01T03:00:00Z' },
    ])
  })
  it('acepta un período abierto solo con fecha inicial', async () => {
    const { service, dates } = setup()
    await service.listar({ periodo: 'personalizado', desde: '2025-01-01' })
    expect(dates).toEqual([{ operator: 'gte', value: '2025-01-01T03:00:00Z' }])
  })
  it('rechaza rangos invertidos o personalizados vacíos antes de leer registros', async () => {
    const { service, query } = setup()
    await expect(service.listar({ desde: '2026-11-15', hasta: '2026-11-01' })).rejects.toThrow('posterior')
    await expect(service.listar({ periodo: 'personalizado' })).rejects.toThrow('al menos una fecha')
    expect(query.all).not.toHaveBeenCalled()
  })
  it('mantiene el límite máximo de 100 para otros consumidores de la API', async () => {
    const { service, query } = setup()
    await service.listar({ limite: 1000 })
    expect(query.limit).toHaveBeenCalledWith(100)
  })
})
