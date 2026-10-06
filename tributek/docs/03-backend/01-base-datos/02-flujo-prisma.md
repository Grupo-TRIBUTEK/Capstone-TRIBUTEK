# Flujo del contrato Prisma

El backend usa Prisma `8.0.0-rc.13` y `@prisma/orm-postgres` `8.0.0-rc.8`, según
`package.json` y `package-lock.json`. El contrato PSL fuente es
`backend/prisma/contract.prisma`; `prisma.config.ts` lo enlaza con
`DATABASE_URL`.

Prisma 8 usa un contrato de datos y un runtime PostgreSQL. Las consultas del
backend pasan por `src/prisma/db.ts` y `PrismaService`; no se usa
`@prisma/client` ni el `PrismaClient` de Prisma 7.

## Archivos y responsabilidades

| Archivo | Responsabilidad |
| --- | --- |
| `prisma/contract.prisma` | Fuente editable de modelos y relaciones. |
| `prisma/contract.json` | Contrato emitido que consume el runtime y la CLI. |
| `prisma/contract.d.ts` | Tipos TypeScript emitidos para las consultas. |
| `prisma.config.ts` | Ruta del contrato y conexión de la CLI. |
| `src/prisma/db.ts` | Crea el runtime PostgreSQL y carga `DATABASE_URL`. |
| `src/prisma/prisma.service.ts` | Conecta el runtime al iniciar Nest y lo cierra al detenerlo. |

No edites manualmente `contract.json` ni `contract.d.ts`: regenera ambos desde
`contract.prisma`.

## Flujo al modificar el contrato

Ejecuta los comandos desde `tributek/backend`:

1. Modifica `prisma/contract.prisma` y revisa el cambio con el equipo.
2. Emite y valida los artefactos sin conectarte a PostgreSQL:

   ```powershell
   npx prisma contract format
   npx prisma contract emit
   ```

3. Revisa los archivos generados y el cambio de contrato en Git.
4. Para cambios de base de datos, acuerda con el equipo un plan revisable antes
   de aplicar operaciones. La CLI instalada ofrece `prisma migration plan` y
   `prisma db migrate`; planificar genera un paquete de migración, aplicar una
   migración cambia la base.
5. Verifica la base objetivo después del cambio:

   ```powershell
   npx prisma db verify
   ```

`contract emit` es offline y no modifica la base de datos. `db verify` consulta
la base sin crear ni actualizar tablas. `db init` está reservado para inicializar
una base local nueva; sus precauciones están en
[Configuración de PostgreSQL](configuracion-postgresql.md).

## Estado de migraciones en el repositorio

Al revisar los archivos versionados, `backend/migrations/` contiene una
referencia `app/refs/db.json` y un snapshot del contrato, pero no un paquete de
migración de aplicación listo para aplicar. No asumas que un cambio de contrato
ya está desplegado o que la base local de cada integrante está sincronizada.
Coordina el procedimiento con el equipo antes de modificar una base compartida.

## Referencia oficial

- [Contrato de datos de Prisma ORM](https://www.prisma.io/docs/orm/contract-authoring/the-data-contract)
- [Emitir artefactos del contrato](https://www.prisma.io/docs/cli/contract-emit)
