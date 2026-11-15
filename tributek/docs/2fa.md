# 2FA (autenticación de dos factores) — TributeK

Documentación de la implementación 2FA (TOTP, compatible con Google Authenticator) integrada en eature/doble-auth. Basada en el código actual; no modifica comportamiento.

## Funcionamiento
- **Activación (usuario autenticado):** POST /auth/2fa/setup (JWT, contraseña) genera secreto TOTP, URI/QR y guarda secreto temporal cifrado con expiración (10 min). POST /auth/2fa/confirm (JWT, código TOTP) valida, activa 2FA, cifra y persiste el secreto, limpia el temporal y genera **códigos de recuperación de un solo uso** (devueltos una sola vez; solo se almacenan hashes).
- **Login:** POST /auth/login valida credenciales. Si la cuenta tiene 2FA habilitado y secreto configurado, responde { requires2FA, challengeToken } (JWT temporal purpose:'2fa-login', jti, 5 min, firmado con JWT_2FA_SECRET) **sin** ccess_token. POST /auth/2fa/verify (público) valida desafío + TOTP o código de recuperación y emite el JWT de acceso (purpose:'access'). El frontend (LoginForm, uth-client) completa el segundo paso y guarda sesión solo tras verificar.
- **Recuperación:** códigos consumidos de forma atómica/one-time (hash Argon2); su uso **no desactiva** 2FA.
- **Desactivación/estado:** POST /auth/2fa/disable (JWT, contraseña + TOTP vigente), GET /auth/2fa/status (JWT). UI: TwoFactorSettings en /admin/seguridad y /cliente/seguridad.
- **Seguridad aplicada:** jwt.strategy rechaza tokens no-acceso/2fa-login; secretos TOTP cifrados en reposo (AES-256-GCM); hashes Argon2 para contraseñas/recuperación; expiración de setup pendiente; rate-limit y anti-replay TOTP best-effort **en memoria**. **Fail-closed:** si 	woFactorEnabled=true y falta 	woFactorSecret, el login rechaza el acceso (no emite token ni desafío).

## Variables de entorno (backend, requeridas para 2FA)
Configurar en entorno (sin valores reales en repo): JWT_SECRET (acceso), JWT_2FA_SECRET (desafío 2FA, independiente, sin fallback), TWO_FACTOR_ENCRYPTION_KEY (cifrado de secretos TOTP). Existentes: DATABASE_URL, PORT (opcional), FRONTEND_URL según despliegue. Re-login requerido tras cambios/endurecimiento de claves.

## Migraciones y requisitos de BD
PostgreSQL (usuarios, contrato Prisma). Migraciones aditivas preparadas:
- 	ributek/backend/migrations/app/20261115T0305_2fa_usuario/migration.sql (	wo_factor_enabled, 	wo_factor_secret, 	wo_factor_temp_secret)
- 	ributek/backend/migrations/app/20261115T1405_2fa_recovery_expiry/migration.sql (	wo_factor_recovery_hashes, 	wo_factor_setup_expires_at)

Aplicar con el flujo de migraciones acordado y verificar esquema antes de operar. **No ejecutar en compartida/prod sin coordinación.** Contrato: 	ributek/backend/prisma/contract.prisma (+ artefactos emitidos).

## Limitaciones conocidas
- Desafíos, rate-limit y anti-replay en memoria: no durables ni compartidos entre instancias/reinicios.
- Sin throttling global de POST /auth/login documentado/garantizado a nivel app.
- Validación de entrada de DTOs 2FA limitada (sin class-validator global observado).
- Auditoría de eventos 2FA (login completado vía verify, setup/disable) puede ser incompleta.
- Flujos de activación/restablecimiento de cuenta preexistentes: revisar políticas de un solo uso según implementación vigente.

## Pruebas (seguras, sin tocar BD real)
- Backend: cd tributek/backend && npm test y
px tsc --noEmit --project tsconfig.build.json (specs uth.service.spec.ts, jwt.strategy.spec.ts con mocks).
- Frontend: cd tributek/frontend && npx tsc --noEmit --project tsconfig.json /
pm run build /
pm run lint según disponibilidad. Validación manual recomendada: activar 2FA, login con desafío, recuperación one-time, desactivar y revisión de UI en light/dark.
