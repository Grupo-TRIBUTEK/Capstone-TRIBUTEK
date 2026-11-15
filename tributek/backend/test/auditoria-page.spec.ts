import { describe, expect, it } from 'vitest'
import { AUDIT_PAGE_SIZE, parsePage } from '../../frontend/app/components/auditoria/model'

const row = { id: '1', creadoEn: '2026-11-15T12:00:00Z', accion: 'CREAR', entidad: 'Cliente', entidadId: '5', detalle: 'Registro creado', usuario: { nombreUsuario: 'ConstanzaS' } }
describe('Página de trazabilidad del navegador', () => {
  it('admite 25 filas de una consulta con más coincidencias', () => {
    const items = Array.from({ length: 25 }, (_, index) => ({ ...row, id: String(index + 1) }))
    expect(AUDIT_PAGE_SIZE).toBe(25)
    expect(parsePage({ items, total: 480 })).toEqual({ items, total: 480 })
  })
  it('rechaza una respuesta que envía más filas que una página', () => {
    expect(() => parsePage({ items: Array(26).fill(row), total: 480 })).toThrow('cantidad')
  })
  it('acepta un resultado vacío y no acepta un conteo inferior a las filas', () => {
    expect(parsePage({ items: [], total: 0 })).toEqual({ items: [], total: 0 })
    expect(() => parsePage({ items: [row], total: 0 })).toThrow('cantidad')
  })
})
