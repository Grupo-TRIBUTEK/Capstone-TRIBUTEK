import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source = readFileSync(new URL('../app/components/ia/interfaz.ts', import.meta.url), 'utf8')
const { validarPropuesta, rutasPermitidas, comprobarDestino } = await import('data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64'))
const captura = { controles: [{ id: '1', nombre: 'Guardar', tipo: 'boton' }, { id: '2', nombre: 'Monto', tipo: 'numero' }] }
test('solo admite rutas conocidas del portal actual', () => {
  assert.deepEqual(rutasPermitidas('/login'), [])
  assert.equal(validarPropuesta({ tipo: 'navegar', destino: '/admin/f29' }, captura, '/cliente'), null)
  assert.equal(validarPropuesta({ tipo: 'navegar', destino: 'javascript:alert(1)' }, captura, '/admin'), null)
  assert.equal(validarPropuesta({ tipo: 'navegar', destino: '/admin/f29' }, captura, '/admin').destino, '/admin/f29')
})
test('rechaza cambios a controles inexistentes o tipos incompatibles', () => {
  assert.equal(validarPropuesta({ tipo: 'pulsar', control: '99' }, captura, '/admin'), null)
  assert.equal(validarPropuesta({ tipo: 'rellenar', control: '1', valor: '100' }, captura, '/admin'), null)
  assert.equal(validarPropuesta({ tipo: 'pulsar', control: '2' }, captura, '/admin'), null)
  assert.deepEqual(validarPropuesta({ tipo: 'rellenar', control: '2', valor: '15000' }, captura, '/admin'), { tipo: 'rellenar', control: '2', valor: '15000' })
})
test('bloquea la acción cuando cambió el cliente de la pantalla', t => {
  const original = globalThis.document
  globalThis.document = { querySelectorAll: () => [{ textContent: 'Cliente B' }] }
  t.after(() => { globalThis.document = original })
  assert.throws(() => comprobarDestino({ controles: [], elementos: new Map(), pagina: 'Cliente A' }, { tipo: 'navegar', destino: '/admin' }), /pantalla cambió/)
})
