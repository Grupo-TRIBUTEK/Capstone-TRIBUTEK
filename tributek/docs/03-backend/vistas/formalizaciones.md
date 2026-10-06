# Formalizaciones → tabla `gestiones`

> Fase 2 · vista 1 de 7 (orden por facilidad). Estado: **decisiones cerradas (2026-10-05);
> migración aplicada (2026-10-06); backend listo y frontend consumiéndolo (2026-10-06).**
> Regla de la fase: el backend es la fuente de verdad; este documento se mantiene
> actualizado a medida que se avanza (ir marcando qué quedó hecho).
> Nota: el análisis previo `formalizaciones2.md` fue eliminado y absorbido aquí (§§3-5, 9).

## 1. Qué hay hoy (2026-10-06, post-migración)

**Frontend (lee del backend):**

- La vista se abre en `frontend/app/admin/formalizaciones/page.tsx` → `Workspace view="formalizaciones"`.
- Tabla "Creación de empresas" (`Workspace.tsx:1045-1105`): por cada cliente calcula
  **Progreso** (pasos `Completado` / total, excluyendo `No corresponde`) y **Próximo paso**
  (primer paso no completado **en orden del catálogo**, porque `GET /gestiones` ordena
  por `orden ASC`).
- Clientes: `GET /clientes` (la rama `formalizaciones` usa `remote`, igual que la vista
  "clientes"; la BD es la fuente de verdad del directorio).
- Checklist: `GET /gestiones?clienteId=&tipo=Formalización` → cabecera (`parentId=null`)
  + 11 pasos. Al guardar: `PUT /gestiones/formalizacion/:clienteId` (reemplaza los 11 pasos).
- Modal `Formalization.tsx`: checklist de 11 pasos fijos (`model.ts:50-62`),
  4 estados por paso (`model.ts:63-68`: Pendiente, En proceso, Completado, No corresponde),
  fecha por paso (`<input type="date">`), y un textarea "Observaciones" (máx. 1000)
  — se envía como `nota` en la cabecera del PUT.
- Los **respaldos** (subir/listar/descargar archivos) usan el backend `/documentos`.

**Backend (implementado):**

- Módulo `src/gestiones/` (controller/service/module/DTO `guardar-formalizacion.dto.ts`),
  rutas bajo `JwtAuthGuard` (clase) + `RolesGuard`/`@Roles('ADMIN', 1)` (método).
- Migración `20261006T0517_gestiones_formalizacion_self_relation`: `parent_id`, `orden`,
  `fecha` + self-relation CASCADE. Verificada con `db verify` (2026-10-06).

## 2. Qué vamos a almacenar

**Sí se persiste (1 cabecera + 1 fila por paso = 12 filas por cliente con proceso):**

| Dato del frontend | Campo del `Process` |
| --- | --- |
| Nombre del paso | `ProcessStep.name` |
| Estado del paso | `ProcessStep.state` |
| Fecha del paso | `ProcessStep.date` (YYYY-MM-DD o vacío) |
| Observaciones globales | `Process.note` (máx. 1000) |
| Cliente dueño del checklist | `Process.clientId` |

**No se persiste (se deriva / es constante de código):**

- Progreso `done/total`, %, "próximo paso" → se calculan al vuelo desde los estados.
- Catálogo de los 11 pasos → constante en `model.ts`, no vive en la BD.
- Estado general del proceso → derivado de sus pasos.

## 3. Mapeo a las columnas de `gestiones`

Hay **dos niveles de fila**: una **cabecera** por formalización y un **paso** por cada
uno de los 11 pasos del catálogo.

| Columna | Cabecera | Paso | Nota |
| --- | --- | --- | --- |
| `cliente_id` | `Process.clientId` | mismo que la cabecera | NOT NULL ✓ |
| `parent_id` **(nueva)** | `NULL` | id de la cabecera | agrupa los pasos — ver §4.3 |
| `titulo` | `'Formalización'` | nombre del paso (catálogo, p. ej. "E-RUT") | máx. 180 |
| `tipo` | `'Formalización'` | `'Formalización'` | discriminador de la vista (futuras vistas usan otro `tipo`) |
| `estado` | derivado de sus pasos | `ProcessStep.state` | cabecera: `Completado` si todos los pasos están `Completado`/`No corresponde`, si no `En proceso` |
| `fecha` **(nueva)** | `NULL` | `ProcessStep.date` → `Date` o `null` | fecha del paso — ver §4.1 |
| `orden` **(nueva)** | `NULL` | 1..11 según el catálogo | `ORDER BY orden` — ver §4.2 |
| `descripcion` | `Process.note` (máx. 1000) | `NULL` | la nota global se guarda **una sola vez** — ver §4.3 |
| `fecha_vencimiento` | `NULL` | `NULL` | no se usa en esta vista (es "fecha límite") |
| `servicio_id` / `periodo_id` / `responsable_id` | `NULL` | `NULL` | no aplican al checklist |
| `visible_cliente` | `true` | `true` | ver §4.4 |
| `creado_por` | `request.user.id` (JWT) | `request.user.id` | auditoría |
| `creado_en` / `actualizado_en` | automático | automático | |

**Convención de filas:**

- Cliente **sin** cabecera con `tipo='Formalización'` → "Iniciar proceso".
- El guardado es **reemplazo total** en una transacción: borra la cabecera y sus pasos
  (FK `ON DELETE CASCADE`) y vuelve a crear cabecera + 11 pasos con `orden` 1..11.
- La tabla queda con 12 filas por cliente × N clientes: volumen despreciable.

## 4. Decisiones de diseño (cerradas — 2026-10-05)

La tabla no fue diseñada para checklists; con la migración de §6 las brechas quedan
resueltas así:

### 4.1 Fecha del paso → columna nueva `fecha` ✅

No se reusa `fecha_vencimiento` ("fecha límite" ≠ "fecha en que se hizo el trámite").
Se agrega `fecha Date?`; para esta vista `fecha_vencimiento` queda en `NULL`.

### 4.2 Orden del paso → columna nueva `orden` ✅

`orden SmallInt?`: el `PUT` escribe 1..N en el orden del catálogo y la lectura usa
`ORDER BY orden`. Ya no se depende de `ORDER BY id`.

### 4.3 Nota global → `parent_id` + fila cabecera (opción C) ✅

Una **cabecera** (`parent_id = NULL`) representa la formalización del cliente y guarda
la nota global en `descripcion`; los 11 pasos apuntan con `parent_id` al id de la
cabecera. La nota se escribe **una sola vez** — sin duplicación ni desincronización.

### 4.4 `visible_cliente` → `true` ✅

Los pasos del checklist son visibles para el cliente. (Las subidas de `/documentos`
siguen en `false`: un respaldo es material de trabajo, el avance del trámite es
información al cliente.)

### 4.5 Datos locales viejos → no se importan ✅

Solo se persiste el checklist definido de 11 pasos. Los respaldos JSON que exporta la
UI sirven como archivo del Ledger anterior.

## 5. API propuesta

Guard estilo `/documentos`: `JwtAuthGuard` + `RolesGuard` + `@Roles('ADMIN', 1)` en todo.

| Método y ruta | Función |
| --- | --- |
| `GET /gestiones/formalizacion/:clienteId` | Devolver `{ steps: [{name, state, date}], note }`; vacío si no hay proceso. |
| `PUT /gestiones/formalizacion/:clienteId` | Reemplazo total del checklist (borra + crea en transacción). Devuelve el checklist guardado. |
| `GET /gestiones?clienteId=&tipo=` | Listado genérico de filas; alimenta la tabla de progreso de **todos** los clientes y sirve para vistas futuras. |

Body del `PUT` (shape 1:1 con el `Process` del frontend):

```json
{
  "steps": [
    { "name": "Reunión inicial", "state": "Completado", "date": "2026-03-10" },
    { "name": "Estatutos", "state": "Pendiente", "date": "" }
  ],
  "note": "Observaciones del proceso"
}
```

Validación (manual, `class-validator` aún no está instalado — decisión pendiente):
cliente existe; `state` ∈ los 4 estados; **`name` ∈ catálogo de los 11 trámites de
Formalización y ≤ 180**; `date` vacío → `null`, si no `YYYY-MM-DD`; `note` ≤ 1000;
≤ 50 pasos por request.

Side-effect previsto: al guardar, insertar una fila en `auditoria`
(`accion='CHECKLIST_FORMALIZACION_GUARDADO'`, `entidad='gestiones'`). Puede ir en v1 o después.

## 6. Archivos a crear / modificar

**Backend — crear:**

| Archivo | Contenido |
| --- | --- |
| `backend/src/gestiones/gestiones.module.ts` | `GestionesModule` (Prisma + Auth, patrón de `documentos.module.ts`) |
| `backend/src/gestiones/gestiones.controller.ts` | Los 3 endpoints + guards/roles |
| `backend/src/gestiones/gestiones.service.ts` | `obtener()`, `guardar()` (reemplazo total), `listar()` |
| `backend/src/gestiones/dto/guardar-formalizacion.dto.ts` | `{ steps, note }` tipado |

**Backend — modificar:**

| Archivo | Cambio |
| --- | --- |
| `backend/prisma/contract.prisma` | `Gestion`: +`parent_id` (self-relation), +`orden`, +`fecha`; relaciones |
| `backend/src/app.module.ts` | importar `GestionesModule` |

**Frontend — modificar:**

| Archivo | Cambio |
| --- | --- |
| `frontend/app/components/management/Formalization.tsx` | Cargar con `GET` al abrir; "Guardar checklist" → `PUT` (dejar de usar `save()` para el checklist; los respaldos ya van a `/documentos`) |
| `frontend/app/components/management/Workspace.tsx` | Tabla "Creación de empresas" (líneas 1045-1105) lee `GET /gestiones` en vez de `meta.processes` |

**Frontend — sin cambios:** `management/model.ts` (tipos y catálogos se reutilizan tal cual).

**Docs:**

- `docs/03-backend/formalizaciones.md` — este archivo (creado).
- `docs/03-backend/tareas.md` — tarea 5 agregada.
- `docs/03-backend/04-referencia/modulos-api.md` — sección `/gestiones` (al implementar).

**Migración de BD:** sí — aditiva (3 columnas nuevas en `gestiones`, sin tocar datos
existentes). Flujo de 5 etapas de `01-base-datos/03-flujo-prisma-migracion.md`:
`contract format` + `contract emit` → `migration plan` → `db migrate` → `db verify`.

## 7. Orden de implementación

1. ✅ **Migración (2026-10-06):** `contract.prisma` (+`parent_id`, +`orden`, +`fecha`,
   self-relation `GestionParent` con `ON DELETE CASCADE`) → flujo de 5 etapas completado;
   `db verify` OK (migración `20261006T0517_gestiones_formalizacion_self_relation`).
2. ✅ **Backend (2026-10-06):** DTO → service → controller → `GestionesModule` →
   registrado en `app.module.ts` (`src/gestiones/`, 4 archivos nuevos).
3. ✅ **Endpoints probados (2026-10-06):** 401 sin token, 403 rol cliente, 200 admin,
   400 en las 6 validaciones (faltan pasos, paso desconocido, estado, fecha, nota,
   clienteId no numérico), 404 cliente inexistente, PUT reemplazo total verificado
   en BD (12 filas, sin duplicados). Build y lint en verde.
4. Pendiente: Frontend — `Formalization.tsx` GET/PUT.
5. Pendiente: Frontend — tabla de `Workspace.tsx` desde `GET /gestiones`.
6. ✅ **Docs (2026-10-06):** `modulos-api.md` (sección `/gestiones`), `tareas.md`,
   este archivo (estado actualizado).

## 8. Criterios de aceptación

- El checklist sobrevive cambiar de navegador/dispositivo (antes no: era localStorage).
- `GET` devuelve los 11 pasos en orden del catálogo; `PUT` persiste estados/fechas/nota.
- La tabla de progreso se calcula en el frontend desde `GET /gestiones` (nada guardado).
- Sin token → 401; rol cliente → 403.
- `npm run build` y lint del backend y frontend en verde.
- El checklist ya no se escribe en `tributek:ficha-ensayo:v1`.

## 9. Decisiones cerradas (2026-10-05)

1. §4.1 fecha → **columna nueva `fecha`** (migración aditiva, no se reusa `fecha_vencimiento`).
2. §4.2 orden → **columna nueva `orden`**.
3. §4.3 nota global → **`parent_id` + fila cabecera** (opción C, migración aditiva).
4. §4.4 `visible_cliente` → **`true`** para cabecera y pasos.
5. §4.5 importar checklists locales viejos → **no** (los respaldos JSON son el archivo del dato).
6. §5 validación de `name` → **contra el catálogo de 11 trámites** + largo máximo.
7. Almacenamiento → **en `gestiones`** (la propia tabla, con self-relation); no se crea
   una tabla `Formalizacion` nueva. Criterio: la entidad conceptual "Formalización" no
   tiene datos propios que excedan la cabecera (observaciones → `descripcion`, estado →
   derivado); **sí tendría sentido una tabla propia el día que aparezcan datos que la
   cabecera no absorba** (fechas de contratación, responsable histórico, etc.).

**Migración única resultante:** 3 columnas nuevas (`parent_id`, `orden`, `fecha`) en
`gestiones`. Nada de reescritura de datos.

**Supuesto adoptado (no bloquea):** **una formalización por cliente** — el `PUT`
reemplaza por `cliente_id + tipo`. Si algún día se necesitan varias, se cambia el
contrato de los endpoints (ruta con id de formalización); `parent_id` lo admite sin
migración.

**Reglas derivadas (quedan escritas aquí, no hacía falta preguntar):**

- Cada PUT escribe **exactamente 11 pasos**, cada nombre del catálogo **una sola vez**
  (11 nombres únicos + validación de pertenencia al catálogo → imposible repetir).
- **No hay acción de cierre en v1:** cuando todos los pasos están `Completado`/`No
  corresponde`, el `estado` de la cabecera pasa a `Completado` (calculado en cada PUT)
  y la edición sigue habilitada. Bloquear/ archivar sería una regla nueva, si algún día
  se necesita.

**Preguntas que siguen abiertas (no bloquean el backend):**

- `class-validator`/`class-transformer`: instalar y usar `ValidationPipe` global, o
  seguir con validación manual en el service (afecta a toda la Fase 2, no solo a esta vista).
- Auditoría en `auditoria` al guardar (§5): incluirla en v1 o agregarla después.