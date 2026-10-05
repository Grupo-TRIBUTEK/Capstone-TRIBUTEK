# Incidencias históricas de Prisma

Este archivo conserva notas de la configuración inicial. Los errores y
respuestas que aparecen aquí son antecedentes, no una indicación de que el
problema siga ocurriendo o de que la base de datos actual esté sincronizada.
Para trabajar hoy, sigue la [guía de conexión](configuracion-postgresql.md) y
el [flujo del contrato](flujo-prisma.md).

## Contrato SQL PSL

Las notas iniciales registraron errores al usar tipos nativos Prisma 7 como
`String @db.VarChar(...)`, `DateTime @db.Date` y `Decimal`. El contrato actual
usa tipos como `VarChar`, `Date`, `Timestamptz`, `SmallInt` y `Numeric`; sus
artefactos se emitieron correctamente con la versión fijada en el proyecto.

Para cambiar modelos, no copies esos errores antiguos ni edites los artefactos
generados. Edita `prisma/contract.prisma` y sigue
[Flujo del contrato Prisma](flujo-prisma.md).

## Variables de conexión

Las notas iniciales mencionan el error `Provide one binding input`. La
implementación actual de `src/prisma/db.ts` carga `.env`, requiere
`DATABASE_URL` y muestra un error explícito si falta. Si la conexión falla,
confirma la ruta de `.env`, el valor de `DATABASE_URL`, que PostgreSQL esté
iniciado y que la base indicada exista. No publiques la URL con credenciales.

## Serialización de `BigInt`

Una nota inicial registró `Do not know how to serialize a BigInt`. El código
actual convierte `BigInt` a texto al serializar en `src/main.ts`; el login
también devuelve `id` y `rolId` como cadenas. Mantén las respuestas JSON
compatibles y revisa el endpoint específico antes de aplicar una conversión.

Las respuestas de Postman y las credenciales de prueba que aparecían en apuntes
anteriores se retiraron: no se pudieron confirmar en la configuración actual y
no deben usarse como datos de acceso.
