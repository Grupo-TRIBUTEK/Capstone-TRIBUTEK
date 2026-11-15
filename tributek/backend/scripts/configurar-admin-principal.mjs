import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from '@prisma/orm-postgres/runtime'
import 'temporal-polyfill/global'

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envFile = path.join(backend, '.env')
process.loadEnvFile(envFile)
const envText = await fs.readFile(envFile, 'utf8')
const contractJson = JSON.parse(await fs.readFile(path.join(backend, 'prisma/contract.json'), 'utf8'))
const db = postgres({ contractJson, url: process.env.DATABASE_URL })
try {
  await db.connect({ url: process.env.DATABASE_URL })
  const chosen = await db.transaction(async tx => {
    const current = await tx.orm.public.Usuario.where({ nombreUsuario: 'admin' }).first()
    const previous = await tx.orm.public.Usuario.where({ nombreUsuario: 'ContanzaS' }).first()
    const renamed = await tx.orm.public.Usuario.where({ nombreUsuario: 'ConstanzaS' }).first()
    if (current && previous && current.id !== previous.id) throw new Error('Existen cuentas admin y ContanzaS distintas. No se modificó ninguna cuenta.')
    if ((current ?? previous) && renamed && (current ?? previous).id !== renamed.id) throw new Error('Ya existe otra cuenta ConstanzaS. No se modificó ninguna cuenta.')
    const actor = current ?? previous ?? renamed
    if (!actor?.activo) throw new Error('No se encontró una cuenta admin activa para configurar.')
    const role = await tx.orm.public.Rol.where({ id: actor.rolId }).first()
    if (!['ADMIN', 'ADMINISTRADOR'].includes(String(role?.nombre ?? '').toUpperCase())) throw new Error('La cuenta seleccionada no es administrativa.')
    const configured = process.env.ADMIN_MANAGER_USER_ID
    if (configured && configured !== String(actor.id)) throw new Error('Ya existe otra cuenta principal configurada. No se reemplazó.')
    if (current || previous) {
      await tx.orm.public.Usuario.where({ id: actor.id }).update({ nombreUsuario: 'ConstanzaS', actualizadoEn: Temporal.Now.instant() })
      await tx.orm.public.Auditoria.create({ usuarioId: actor.id, entidad: 'Administrador', entidadId: actor.id, accion: 'ACTUALIZAR', detalle: 'Cambio del nombre de acceso de la cuenta principal a ConstanzaS. Se conserva la misma cuenta.', creadoEn: Temporal.Now.instant() })
    }
    return String(actor.id)
  })
  const setting = 'ADMIN_MANAGER_USER_ID=' + chosen
  const next = /^ADMIN_MANAGER_USER_ID=.*$/m.test(envText) ? envText.replace(/^ADMIN_MANAGER_USER_ID=.*$/m, setting) : envText.trimEnd() + '\n' + setting + '\n'
  const privateDir = path.join(backend, '.tmp')
  await fs.mkdir(privateDir, { recursive: true, mode: 0o700 })
  const backupFile = path.join(privateDir, 'env-antes-administradores')
  await fs.writeFile(backupFile, envText, { mode: 0o600, flag: 'wx' }).catch(error => { if (error.code !== 'EEXIST') throw error })
  const temporary = path.join(privateDir, 'env-administradores-' + Date.now())
  await fs.writeFile(temporary, next, { mode: 0o600, flag: 'wx' })
  await fs.rename(temporary, envFile)
  console.log('Configuración lista. Usuario: ConstanzaS. Se conservan el ID, la contraseña y el historial. Reinicia el backend y vuelve a iniciar sesión.')
} catch (error) {
  console.error(error instanceof Error ? error.message : 'No se pudo configurar la cuenta principal.')
  process.exitCode = 1
} finally { await db.close() }
