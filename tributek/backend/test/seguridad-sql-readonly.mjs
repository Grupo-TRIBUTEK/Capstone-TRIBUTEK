import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { db } from '../dist/prisma/db.js'
import { ClientesService } from '../dist/clientes/clientes.service.js'

await db.connect({ url: process.env.DATABASE_URL })
try {
  const counts = async () => ({
    clientes: Number((await db.orm.public.Cliente.aggregate(t => ({ n: t.count() }))).n),
    usuarios: Number((await db.orm.public.Usuario.aggregate(t => ({ n: t.count() }))).n),
  })
  const before = await counts()
  const clientes = new ClientesService({ db }, {})
  const cases = []
  for (const value of ["' OR '1'='1", "' OR 1=1 --", "qa' UNION SELECT NULL --"]) {
    const exact = await db.orm.public.Usuario.where({ nombreUsuario: value }).first()
    const search = await clientes.obtenerClientes(value)
    assert.equal(exact, null)
    assert.equal(search.length, 0)
    cases.push({ entrada: value, coincidenciasUsuario: 0, coincidenciasClientes: 0, aprobado: true })
  }
  assert.deepEqual(await counts(), before)
  const report = { fecha: '2026-11-15', entorno: 'PostgreSQL local con ORM real', modo: 'solo lectura', casos: cases, cambiosDeDatos: 0 }
  await writeFile('.tmp/qa-seguridad-sql.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
} finally { await db.close() }
