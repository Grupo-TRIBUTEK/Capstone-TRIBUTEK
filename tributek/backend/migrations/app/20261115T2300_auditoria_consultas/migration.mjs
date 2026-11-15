import { spawnSync } from 'node:child_process'

// Ejecutar desde tributek/backend. La conexión privada se entrega por entorno.
process.loadEnvFile()
const connection = new URL(process.env.DATABASE_URL)
const env = { ...process.env,
  PGHOST: connection.hostname,
  PGPORT: connection.port || '5432',
  PGDATABASE: decodeURIComponent(connection.pathname.slice(1)),
  PGUSER: decodeURIComponent(connection.username),
  PGPASSWORD: decodeURIComponent(connection.password),
  PGOPTIONS: '-c lock_timeout=3000 -c statement_timeout=120000',
}
const indexes = [
  ['auditoria_fecha_id_idx', 'creado_en, id'],
  ['auditoria_entidad_fecha_id_idx', 'entidad, creado_en, id'],
  ['auditoria_accion_fecha_id_idx', 'accion, creado_en, id'],
]
for (const [name, columns] of indexes) {
  const result = spawnSync('psql', ['--no-psqlrc', '--no-password', '--set=ON_ERROR_STOP=1',
    '--command', `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${name} ON public.auditoria (${columns})`],
    { env, encoding: 'utf8' })
  if (result.status !== 0) {
    console.error(`No se pudo crear el índice ${name}. Revisa la conexión y vuelve a ejecutar la migración.`)
    process.exit(1)
  }
  console.log(`Índice disponible: ${name}`)
}
