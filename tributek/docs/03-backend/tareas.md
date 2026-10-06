#	Tareas
1	Paquete de migraciones	Listo: baseline 20261005T0659 (14 tablas, 71 ops, proyecciones_f29 incluido).
2	RolesGuard en /documentos + filtro visibleCliente	Hecho (A). Pendiente (B): aplicar filtro visibleCliente en listar() y descargar().
3	Módulo periodos (CRUD)	Dependencia directa del F29
4	Ahora sí: F29	Con 1-3 listos, es trabajo mecánico
5	Módulo gestiones (vista Formalizaciones)	Hecho (2026-10-06): migración parent_id+orden+fecha, módulo src/gestiones (3 endpoints, validación catálogo), endpoints verificados (401/403/400/404, reemplazo total 12 filas). PENDIENTE: Formalization.tsx GET/PUT y tabla Workspace desde GET /gestiones.

#	Trabajo reciente en backend

##	Cierre de la brecha de autorización en /documentos

**Problema:** los endpoints de documentos (`GET /documentos`, `POST /documentos`, `GET /documentos/:id/descargar`) estaban sin protección de rol: cualquier usuario autenticado —incluso un cliente común— podía listar, subir y descargar todos los documentos de todos los clientes.

**Qué se hizo:** se agregó a `documentos.controller.ts` la protección en dos capas:

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 1)
```

- `JwtAuthGuard`: exige un JWT válido (nadie entra sin sesión).
- `RolesGuard` + `@Roles('ADMIN', 1)`: solo pasa el rol administrador (por nombre `ADMIN` o por `rolId = 1`).

**Consecuencia:** un cliente ya no puede leer ni subir documentos de otros; intentarlo devuelve `403 Forbidden`. El endpoint `tipos-sugeridos` quedó solo con `JwtAuthGuard` (cualquier usuario logueado puede consultar los tipos, no es sensible).

##	Tipado del body con DTO

**Problema:** `@Body() data: any` en `cargar()` — sin tipado, cualquier campo basura entraba al servicio y TS no ayudaba a detectar errores.

**Qué se hizo:** se creó `documentos/dto/cargar-documento.dto.ts` con `CargarDocumentoDto` (`clienteId?`, `periodo?`, `tipo?`, `estado?`, `observacion?`) y se usó en el controller y en `documentos.service.ts`.

**Consecuencia:** el body queda documentado y tipado en tiempo de compilación. *Nota:* esto es solo tipado — no valida formatos todavía, porque `class-validator` no está instalado (decisión pendiente: instalarlo y usar `ValidationPipe` global).

##	Estado

- Build y lint ✅ (2 tests rojos en `clientes.service.spec.ts` son preexistentes, verificado con `git stash`).
- Pendiente: filtro `visibleCliente` en `listar()`/`descargar()` (paso B del plan en `04-referencia/04-autorizacion-documentos.md`).