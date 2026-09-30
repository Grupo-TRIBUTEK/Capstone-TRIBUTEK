# Guía del backend TRIBUTEK

Esta carpeta documenta la API NestJS, sus rutas, autenticación y acceso a datos.
Describe el código disponible en el repositorio; una ruta implementada no implica
que tenga una política de autorización adecuada para producción.

## Lectura recomendada

1. [Configuración de PostgreSQL](base-datos/configuracion-postgresql.md): variables locales y conexión.
2. [Flujo del contrato Prisma](base-datos/flujo-prisma.md): artefactos generados y cambios de esquema.
3. [Autenticación](autenticacion/01-login.md) y [hash de contraseñas](autenticacion/02-verificacion-contrasena.md).
4. [Rutas y módulos de la API](referencia/modulos-api.md).
5. [Incidencias históricas de Prisma](base-datos/incidencias-prisma.md), si aparece un error parecido.
   - [Guia inicial de Prisma](base-datos/guia-inicial-prisma.md): preparacion del entorno desde cero.
   - [Errores iniciales de Prisma](base-datos/errores-iniciales-prisma.md): notas historicas de instalacion.

## Componentes activos

`src/app.module.ts` registra `AuthModule`, `ClientesModule`, `ServiciosModule`,
`DocumentosModule` y `PrismaModule`. `main.ts` inicia NestJS en el puerto definido
por `PORT`, que por defecto es `3001`.

| Área | Código | Función actual |
| --- | --- | --- |
| Autenticación | `src/auth/` | Login, activación de cuenta, JWT y guards |
| Clientes | `src/clientes/` | Clientes, vínculos de portal e invitaciones |
| Servicios | `src/servicios/` | Servicios y asignaciones cliente-servicio |
| Documentos | `src/documentos/` | Metadatos y archivos en `uploads/documentos` |
| Datos | `src/prisma/`, `prisma/` | Runtime PostgreSQL, contrato y tipos emitidos |

`src/usuario/` contiene archivos vacíos y no está registrado en `AppModule`; no
lo documentamos como un módulo operativo ni como una API disponible.

## Ejecutar en desarrollo

Desde la raíz del repositorio:

```powershell
npm ci --prefix tributek/backend
```

Configura `DATABASE_URL` y `JWT_SECRET` en `tributek/backend/.env` siguiendo la
[guía de conexión](base-datos/configuracion-postgresql.md). Después inicia el
servidor:

```powershell
npm run start:dev --prefix tributek/backend
```

El servidor usa `PORT` si está definido; de lo contrario escucha en `3001`.
Para los pasos de instalación generales, consulta el README principal.

## Límites que conviene tener presentes

- Los endpoints de clientes usan guards de JWT y roles. Servicios y documentos
  usan `JwtAuthGuard`, pero sus controladores no declaran `RolesGuard` por ruta.
- Los archivos de documentos se guardan en el disco local. No hay un proveedor
  de almacenamiento en nube configurado en este backend.
- El repositorio incluye una referencia y un snapshot bajo `migrations/`, pero
  no se encontró un paquete de migración de aplicación listo para desplegar.
  Coordina con el equipo antes de aplicar cambios a una base compartida.

## Convenciones de datos

La fuente del contrato es `backend/prisma/contract.prisma`. `contract.json` y
`contract.d.ts` son artefactos emitidos; modifica el contrato fuente y vuelve a
emitirlos, no edites los generados manualmente. El flujo se explica en
[Flujo del contrato Prisma](base-datos/flujo-prisma.md).
