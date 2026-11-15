import { createHash } from 'node:crypto'

// Vincula una credencial temporal o sesión al hash vigente sin revelar ese hash.
export function credentialVersion(passwordHash: string) {
  return createHash('sha256').update(passwordHash).digest('hex')
}
