import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source = readFileSync(new URL('../app/components/ui/rut.ts', import.meta.url), 'utf8')
const { formatoRutValido } = await import('data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText).toString('base64'))
test('exige guion y un solo dígito o K, al escribir o pegar', () => {
  for (const rut of ['12345678-5', '12.345.678-5', '1234567-K', '1.234.567-k']) assert.equal(formatoRutValido(rut), true)
  for (const rut of ['123456785', '12345678-', '12345678-55', '12345678-KK', '12345678--5', '12345678-A', '12345678- 5', '12.34.5678-5', '']) assert.equal(formatoRutValido(rut), false)
})
