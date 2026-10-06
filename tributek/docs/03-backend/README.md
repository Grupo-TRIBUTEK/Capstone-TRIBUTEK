# Evaluación del backend y la base de datos — Panel administrador

> **Estado:** evaluación de línea de base · **Fecha:** 2026-04-10 · **Rama:** `feature/panel-cliente`
> Documento de diagnóstico. Describe lo que el código hace hoy, no lo que debería hacer.

Este documento responde a una pregunta concreta: **cuando un administrador
gestiona algo en el panel, ¿dónde queda guardado ese dato?**

La respuesta corta es que **no hay una respuesta única**. Hoy conviven tres
lugares de almacenamiento distintos, y solo uno de ellos es una base de datos
real. Los otros dos están en el navegador del usuario y en el disco del servidor.

---

## 1. Resumen ejecutivo

| Área | Dónde se guarda hoy | ¿Persiste entre usuarios/navegadores? |
| --- | --- | --- |
| Clientes, portal de acceso | PostgreSQL | Sí |
| Servicios y asignaciones | PostgreSQL | Sí |
| Documentos (metadatos) | PostgreSQL | Sí |
| Documentos (archivos) | Disco local `uploads/documentos` | Sí, pero atado a un servidor |
| **Ficha de clientes (pagos, meses, saldo)** | **`localStorage` del navegador** | **No** |
| **F29 (proyecciones)** | **`localStorage` del navegador** | **No** |
| **Procesos de formalización** | **`localStorage` del navegador** | **No** |

**El hallazgo central:** el panel administrador tiene varias secciones visibles
(clientes, facturación, f29, formalizaciones, obligaciones, pagos,
postergaciones), pero **solo 3 tienen respaldo en el backend**. Las restantes
—incluidas *Facturación*, *F29* y *Pagos*, que son el núcleo del negocio—
existen solo en el navegador donde se escribieron.

Si se borra la caché del navegador, o se cambia de computador, **se pierde todo**.

---

## 2. Inventario del contrato de datos

Fuente: `backend/prisma/contract.prisma`. Define **14 modelos** mapeados a tablas
en `snake_case`.

### 2.1 Modelos con tabla y módulo que los usa

| Modelo | Tabla | Campos clave | ¿Tiene módulo API? |
| --- | --- | --- | --- |
| `Rol` | `roles` | `nombre` único | Indirecto (`auth`) |
| `Usuario` | `usuarios` | `email`, `nombre_usuario`, `password_hash`, `activo` | `auth` |
| `Cliente` | `clientes` | `rut` único, `nombre_razon_social`, `estado` | `clientes` |
| `UsuarioCliente` | `usuario_cliente` | PK compuesta, `es_principal` | `clientes` |
| `Servicio` | `servicios` | `nombre` único, `activo` | `servicios` |
| `ClienteServicio` | `cliente_servicio` | único por `(cliente, servicio)` | `servicios` |
| `TipoDocumento` | `tipos_documento` | `nombre` único, `area` | `documentos` |
| `Documento` | `documentos` | `url_archivo`, `visible_cliente`, `tamano_bytes` | `documentos` |
| `PeriodoCliente` | `periodos_cliente` | único por `(cliente, anio, mes)`, `cerrado` | Solo escritura indirecta |

### 2.2 Modelos definidos pero **sin ninguna API que los lea o escriba**

| Modelo | Tabla | Qué representa |
| --- | --- | --- |
| `Gestion` | `gestiones` | **Tareas con vencimiento, responsable y visibilidad al cliente** |
| `Transaccion` | `transacciones` | Movimientos con IVA, montos exento/neto y estado de revisión |
| `ProyeccionF29` | `proyecciones_f29` | Proyección de F29 con versionado, débitos, créditos y PPM |
| `Trabajador` | `trabajadores` | Personal del cliente (carga, ingreso, término) |
| `Auditoria` | `auditoria` | **Bitácora de acciones: quién hizo qué y cuándo** |

> **Ojo con `Gestion` y `Auditoria`.** Son los dos modelos que el proyecto
> necesitaría para que "la gestión" sea trazable, y ambos están definidos pero
> **ningún endpoint los toca**. La tabla `auditoria` nunca ha recibido una
> escritura desde el código de la aplicación.

---

## 3. Lo que sí funciona (verificado en código)

### 3.1 Clientes — flujo completo ✅

`POST /clientes` y `PATCH /clientes/:id` funcionan de punta a punta, e incluyen
el alta del portal del cliente:

1. Valida RUT y email con expresiones regulares.
2. Crea el `Cliente`.
3. Si `accesoPortal.invitar`, crea un `Usuario` con rol `CLIENTE`, `activo: false`,
   `nombreUsuario` generado como `invitacion_<32 hex>` y **password aleatorio**
   con argon2.
4. Crea el vínculo en `usuario_cliente` con `esPrincipal: true`.
5. Devuelve una URL de activación firmada con JWT (`purpose: set-client-password`, 24 h).

La revocación de acceso (`accesoPortal.revocar`) **desvincula y desactiva** la
cuenta si se queda sin otros clientes. Esto está bien resuelto.

### 3.2 Servicios — CRUD y asignaciones ✅

CRUD completo con validación de referencias y `ConflictException` si la
asignación ya existe. `finalizarAsignacion` usa
`Temporal.Now.plainDateISO('America/Santiago')`.

### 3.3 Documentos — carga con almacenamiento desacoplado ✅ (con una reserva)

`LocalDocumentStorageService` implementa la interfaz `DocumentStorage`, lo que
permite cambiar a S3/R2/GCS sin tocar la lógica documental. Esa es una buena
decisión de diseño.

Flujo de `POST /documentos`:

1. Valida archivo, tamaño (10 MiB) y período (`AAAA-MM`).
2. Crea el `PeriodoCliente` si no existe, con `estadoContable: 'PENDIENTE'`.
3. Crea el `TipoDocumento` si no existe, con `area: 'DOCUMENTOS'`.
4. Guarda el archivo con clave `randomUUID()` + extensión.
5. Inserta el registro; **si la insert falla, borra el archivo** (rollback manual). ✅

**La reserva:** el rollback del archivo está bien, pero las operaciones no
están dentro de una transacción de base de datos. Si el `PeriodoCliente` se crea
y luego falla el `TipoDocumento`, el período queda huérfano en la base de datos.

---

## 4. Problemas detectados

### 🔴 Crítico 1 — La gestión vive en el navegador, no en la base de datos

`frontend/app/components/ficha/store.ts` persiste el estado de la ficha en
`localStorage` con la clave `tributek:ficha-ensayo:v1`:

```ts
const KEY = "tributek:ficha-ensayo:v1";
localStorage.setItem(KEY, JSON.stringify(saved));
```

Lo mismo ocurre con el F29, en `frontend/app/components/f29/storage.ts`:

```ts
export const KEY = 'tributek:f29:v1';
```

**Alcance del problema.** Según `management/model.ts`, el tipo `Ledger` incluye
`profiles` (RUT, máquina, honorario, régimen tributario), `clients`, `months`,
`payments`, `deferrals`, `invoices` y `process` (los 11 pasos de formalización
con su estado y fecha). **Ninguna de esas entidades existe como tabla en
`contract.prisma`.**

**Consecuencias:**

- Dos administradores que abran el panel no ven lo mismo.
- Los datos no se respaldan ni se pueden auditar.
- `localStorage` tiene un límite típico de ~5 MB; el ledger completo de una
  contadora con clientes reales lo superaría.
- Cambiar de navegador o limpiar caché **destruye la información**.

> El único punto de contacto con el backend es `syncRemoteClients()`, que
> **descarga** clientes del servidor y los mezcla en el ledger local
> (`mergeClients`). Es una sincronización de **una sola dirección, hacia abajo**.
> Cuando el admin guarda, escribe en `localStorage`.

### 🔴 Crítico 2 — `DocumentosController` no declara control de roles

El controlador aplica `JwtAuthGuard` a toda la clase, pero **no** aplica
`RolesGuard` ni `@Roles(...)` en ninguna ruta:

```ts
@Controller('documentos')
@UseGuards(JwtAuthGuard)   // ← solo autenticación, sin autorización
export class DocumentosController {
```

Comparación con `ClientesController`, que sí está bien protegido:

```ts
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 1)
```

**Impacto concreto:** cualquier usuario con un JWT válido —**incluida una cuenta
con rol `CLIENTE`**— puede invocar `GET /documentos` y recibir la lista
**completa de documentos de todos los clientes**, con nombre de archivo, cliente,
período y tipo. También puede descargar cualquier archivo por ID
(`GET /documentos/:id/descargar`).

El campo `visibleCliente` existe en el modelo `Documento` y siempre se escribe en
`false` al cargar, pero **ninguna consulta lo lee para filtrar**. La flag de
visibilidad está implementada en el esquema y es ignorada en el código.

> Esto es lo que `docs/panel-cliente/introduccion.md` ya anticipaba como
> dependencia. Sigue pendiente.

### 🟠 Alto 3 — No hay migraciones ejecutables

El repositorio contiene:

```
backend/migrations/
├── app/refs/db.json
└── snapshots/f1276e92.../contract.json
├── contract.d.ts
```

Solo hay un **snapshot** y una referencia. **No existe ningún archivo de
migración de aplicación** (un `migration.sql` con los `CREATE TABLE`). Tampoco
hay un `prisma/migrations/` estándar.

La consecuencia práctica: **no hay forma de crear las tablas en una base de
datos nueva.** Quien clone el repositorio no puede levantar el entorno desde
cero siguiendo lo documentado. El esquema existe como contrato declarativo, no
como esquema aplicado.

### 🟠 Alto 4 — Sin CORS ni validación de entrada en documentos

`main.ts` completo es:

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
```

- No hay `app.enableCors()`. Hoy funciona solo porque el frontend proxya las
  rutas vía `next.config.ts` (mismo origen). Si alguien consume la API
  directamente desde otro dominio, fallará.
- `DocumentosController` usa `@Body() data: any` y `@UploadedFile() file: any`.
  **No hay `class-validator` ni `ValidationPipe`.** Se depende de validaciones
  manuales dentro del servicio. Los DTO de clientes y servicios sí están
  tipados, pero tampoco se declara un pipe de validación global.
- No hay `helmet` ni límite de tasa en `/auth/login`.

### 🟡 Medio 5 — Autorización por ID `1` en lugar de solo por rol

```ts
@Roles('ADMIN', 1)
```

Este patrón admite **cualquier usuario cuyo ID sea 1**, sea cual sea su rol. Es
una puerta trasera implícita: si el usuario `1` fuera un cliente, tendría acceso
administrativo completo. Debería bastar el rol `ADMIN`, o la condición del ID
debe documentarse explícitamente.

### 🟡 Medio 6 — La búsqueda de clientes no escapa comodines

`obtenerClientes()` ejecuta dos consultas y las une:

```ts
const porNombre = await baseQuery.where(c => c.nombreRazonSocial.ilike(`%${textoBusqueda}%`)).all();
const porRut    = await baseQuery.where(c => c.rut.ilike(`%${textoBusqueda}%`)).all();
```

El parámetro se interpola con `%` y `_` del usuario. No es inyección SQL
(preparado), pero los comodines no se escapan, así que un usuario que escriba
`%` matchea todos los clientes. Es un detalle menor, pero conviene sanearlo.

### 🟡 Medio 7 — La configuración de Prisma no separa entornos

`prisma.config.ts` lee `DATABASE_URL` del `.env` de forma única, sin
distinción entre desarrollo, pruebas y producción. `main.ts` hace
`import 'dotenv/config'`, y `db.ts` llama `process.loadEnvFile()`.

No es un problema hoy, pero bloquea cualquier estrategia seria de migración.

---

## 5. Mapa de uso desde el frontend

El proxy en `frontend/next.config.ts` expone al navegador:

| Ruta proxied | Destino | Consumidor |
| --- | --- | --- |
| `/auth/*` | `:3001/auth/*` | `LoginForm`, `auth-client` |
| `/clientes/*` | `:3001/clientes/*` | `ClientCreateModal`, `Workspace`, `PortalHome`, `F29Workspace` |
| `/servicios/*` | `:3001/servicios/*` | *(sin consumidor encontrado)* |
| `/documentos/*` | `:3001/documentos/*` | `Formalization.tsx` |

**`/servicios` no lo consume ningún componente del frontend.** El módulo existe
completo en el backend pero está desconectado de la interfaz.

El flujo de datos es de **una sola dirección**:

```
┌──────────────── SERVIDOR ────────────────┐   ┌────── NAVEGADOR ──────┐
│  PostgreSQL  ◄── GET /clientes (baja)  │──►│  Ledger  localStorage │
│  PostgreSQL  ──► (nada)                │   │  F29     localStorage │
│  uploads/    ◄── POST/GET /documentos  │◄──│  Ficha   localStorage │
└─────────────────────────────────────────┘   └────────────────────────┘
      ▲ Lee                                     ▲ Escribe
      │                                         │
  el admin ve y descarga              el admin escribe y "guarda"
```

**Los datos entran al servidor por un solo camino: la carga de documentos.**

---

## 6. Propuesta de trabajo

### Fase 0 — Detener la pérdida de datos (bloqueante)

1. **Crear el paquete de migraciones** con un `migration.sql` que materialice
   las 14 tablas del contrato. Sin esto no hay entorno reproducible.
2. **Verificar el backup/restore del ledger**: ya existe una UI de respaldo en
   `Workspace.tsx`, pero conviene que sea un paso explícito antes de tocar nada más.

### Fase 1 — Cerrar la brecha de autorización

3. **Proteger `/documentos`** con `RolesGuard` + `@Roles('ADMIN', 1)`, replicando
   el patrón de `ClientesController`.
4. **Aplicar el filtro `visibleCliente`** en la consulta, hoy ignorado.
5. **Añadir `ValidationPipe` global** y tipar `@Body()` en `DocumentosController`.

### Fase 2 — Decidir el destino de la gestión ⚠️

Aquí está **la decisión de arquitectura que hay que tomar**, y no es técnica sino
de alcance. Hay dos caminos:

**Camino A — El backend es la fuente de verdad.**
Se crean los módulos y tablas que faltan (`Gestion`, `Transaccion`,
`ProyeccionF29`, `Trabajador`, `Auditoria`, más las entidades del ledger) y el
frontend deja de escribir en `localStorage`. Es el camino correcto y el que
justifica el `contract.prisma` que ya está escrito. Costo alto.

**Camino B — El navegador es deliberadamente local.**
Se asume que la gestión es una herramienta personal de un contador y se documenta
explícitamente que los datos son locales, con respaldo manual. Es mucho más
barato, pero contradice el enunciado del proyecto y deja sin uso la mitad del
esquema.

> Mi recomendación es el **Camino A**, empezando por **una sola sección** —
> probablemente **Pagos** o **F29** — para validar el patrón antes de replicarlo.

### Fase 3 — Completar la trazabilidad

6. **Implementar `Auditoria`**: hoy existe el modelo y nadie escribe en él. Sin
   bitácora no hay forma de saber quién cambió qué, que es justamente lo que el
   panel administrador necesita controlar.

### Fase 4 — Higiene

7. Reemplazar `@Roles('ADMIN', 1)` por solo rol.
8. Habilitar CORS restringido a los orígenes conocidos.
9. Escapar comodines en la búsqueda de clientes.
10. Conectar o retirar el módulo de `/servicios` en el frontend.
11. Agregar rate limiting a `/auth/login`.

---

## 7. Cómo verificar este documento

```powershell
# ¿existen tablas para el ledger?
Select-String -Path tributek/backend/prisma/contract.prisma -Pattern "model (Pago|Factura|Mes|Postergacion)"
# → sin resultados: confirma el problema 1

# ¿qué controllers aplican RolesGuard?
Select-String -Path tributek/backend/src/documentos/documentos.controller.ts -Pattern "Roles"
# → sin resultados: confirma el problema 2

# ¿existe algún migration.sql?
cmd /c "dir /s /b tributek\backend\migrations\*.sql"
# → sin resultados: confirma el problema 3

# ¿dónde persiste el frontend?
Select-String -Path tributek/frontend/app/components/f29/storage.ts,tributek/frontend/app/components/ficha/store.ts -Pattern "localStorage.setItem"
# → confirma el problema 1
```

---

## 8. Documentos relacionados

- [Módulos y rutas de la API](referencia/modulos-api.md)
- [Configuración de PostgreSQL](base-datos/configuracion-postgresql.md)
- [Flujo del contrato Prisma](base-datos/flujo-prisma.md)
- [Panel Cliente — Introducción](../panel-cliente/introduccion.md): describe el
  requisito de permisos que el problema 2 deja abierto.

## Convenciones de datos

La fuente del contrato es `backend/prisma/contract.prisma`. `contract.json` y
`contract.d.ts` son artefactos emitidos: modifica el contrato fuente y vuelve a
emitirlos, no edites los generados manualmente. El flujo se explica en
[Flujo del contrato Prisma](base-datos/flujo-prisma.md).
