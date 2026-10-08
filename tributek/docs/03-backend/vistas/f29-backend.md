# Evaluación: almacenamiento del F29 en el backend

> **Estado:** evaluación de línea de base · **Fecha:** 2026-04-10 · **Rama:** `backend`
> Documento de diagnóstico. Describe qué existe hoy y qué falta para que la
> proyección F29 se persista en el servidor.

## Respuesta corta

**El F29 no tiene backend.** No existe ni un endpoint para él. Toda la
proyección vive en el `localStorage` del navegador, y los CSV del RCV se leen
directamente desde una carpeta del disco del usuario, sin pasar por el servidor.

Las tablas `proyecciones_f29` y `transacciones` **ya están definidas** en el
contrato de Prisma desde el comienzo del proyecto, pero ningún código las lee o
escribe.

---

## 1. Dónde vive hoy el F29

### 1.1 Persistencia

`frontend/app/components/f29/storage.ts`:

```ts
export const KEY = 'tributek:f29:v1';

export function readDatabase(): Database {
  const raw = localStorage.getItem(KEY);
  return raw ? validateDatabase(JSON.parse(raw)) : emptyDatabase;
}

export function writeDatabase(next: Database, revision: string): Database {
  if (readDatabase().revision !== revision)
    throw new Error('F29 cambió en otra pestaña. Recarga la página antes de seguir editando.');
  const saved = validateDatabase({ ...next, revision: crypto.randomUUID() });
  localStorage.setItem(KEY, JSON.stringify(saved));
  return saved;
}
```

Todo el estado del F29 —clientes, proyecciones y las filas de cada documento
RCV— se serializa como un único JSON en esa clave.

### 1.2 Origen de los datos: carpeta local, no el servidor

`folderFiles()` usa la File System Access API:

```ts
const handle = await picker({ mode: 'read' });   // showDirectoryPicker
```

El usuario autoriza el acceso a una carpeta del disco, se leen hasta **2.000 CSV**
en profundidad 3, y se parsean en memoria con `parseRcv()`. **El archivo RCV
original nunca llega al servidor**: se procesa en el navegador y solo queda el
resultado en `localStorage`.

### 1.3 Único punto de contacto con el backend

`F29Workspace.tsx`, línea 139:

```ts
const response = await authenticatedFetch('/clientes');
---

## 2. Las tablas que ya existen

### 2.1 `proyecciones_f29`

Definida en `backend/prisma/contract.prisma`. **15 columnas:**

| Columna | Tipo | Función |
| --- | --- | --- |
| `id` | BigInt | PK, autoincremental |
| `periodo_id` | BigInt | → `periodos_cliente` (cliente + mes/año) |
| `version` | Int | versionado de la proyección |
| `iva_debito` | Numeric(14,2) | débito fiscal del período |
| `iva_credito` | Numeric(14,2) | crédito fiscal |
| `remanente_anterior` | Numeric(14,2) | remanente del mes previo |
| `retenciones` | Numeric(14,2) | |
| `ppm` | Numeric(14,2) | pago precautionary mensual |
| `impuesto_estimado` | Numeric(14,2) | |
| `total_estimado` | Numeric(14,2) | |
| `estado` | VarChar(30) | |
| `generado_por` | BigInt? | → `usuarios` |
| `revisado_por` | BigInt? | → `usuarios` |
| `documento_generado` | BigInt? | → `documentos` (el PDF emitido) |
| `generado_en` | Timestamptz? | |

Tiene 4 índices automáticos en `periodo_id`, `generado_por`, `revisado_por` y
`documento_generado`.

**Problema:** no existe `@unique([periodoId, version])`. La unicidad del
versionado depende de que cada fila se inserte a mano.

### 2.2 `transacciones`

**18 columnas**, aparentemente diseñada para los documentos RCV:

| Columna | Tipo | Encaja con el RCV |
| --- | --- | --- |
| `cliente_id`, `periodo_id` | BigInt | Sí |
| `fecha` | Date | Sí (`row.date`) |
| `direccion` | VarChar(15) | Sí (ventas / compras) |
| `categoria` | VarChar(100)? | Parcial |
| `descripcion` | VarChar(300) | Parcial |
| `monto_exento` | Numeric(14,2) | Sí (`row.exempt`) |
| `monto_neto` | Numeric(14,2) | Sí (`row.net`) |
| `iva` | Numeric(14,2) | Sí (`row.iva`) |
| `monto_total` | Numeric(14,2) | Sí (`row.total`) |
| `estado_revision` | VarChar(30) | — |
| `observacion` | VarChar(1000)? | — |
| `revisado_por`, `revisado_en`, `creado_por`, `creado_en` | | Sí |

### 2.3 Los campos que le faltan a `transacciones`

El tipo `Row` del frontend tiene 10 campos. Comparando:

| Campo RCV | ¿Existe en `transacciones`? |
| --- | --- |
| `code` (tipo de documento) | **Falta** |
| `rut` (contraparte) | Solo implícito en `descripcion` |
| `name` (razón social) | Solo implícito en `descripcion` |
| `folio` | **Falta** |
| `date` | Sí |
| `exempt`, `net`, `iva`, `total` | Sí |

**El `folio` es la ausencia más importante.** El frontend lo usa como clave de
deduplicación:

```ts
const key = [code, rut, folio].join('|');
```

Sin una columna `folio` no se puede evitar subir dos veces el mismo comprobante,
ni identificar el documento cuando el RCV se reimporta.

---

## 3. ¿Documento o columnas?

**Las dos cosas, y esa tensión es el problema de diseño central.**

### Lo que las columnas resuelven

`proyecciones_f29` guarda los **totales ya calculados**: débito, crédito, PPM,
impuesto estimado. Es un snapshot del resultado. Correcto para consultar rápido
"¿cuánto se estimated pagar en marzo?".

### Lo que las columnas NO resuelven

El F29 no es solo un total: se calcula sumando **grupos de documentos** por tipo.
`F29Workspace.tsx` agrupa así:

```ts
saleGroups.map(([name, codes]) =>
  resultRow(`IVA · ${name}`, sumRows(p.sales?.rows.filter(row => codes.includes(row.code)) ?? []).iva)
)
```

Y los tipos soportados son:

```ts
const supported = [33, 34, 39, 41, 46, 56, 61];
```

**Para recalcular, auditar o corregir una proyección hacen falta las filas
crudas.** Con solo los totales no se puede:

- Recalcular si se agrega una compra nueva al período.
- Explicar por qué el total es X (trazabilidad).
- Detectar documentos duplicados.
- Reconstruir el histórico si cambia una tasa de PPM.

La columna `version` sugiere que el versionado existe justamente para esto, pero
**sin filas guardadas no hay nada que versionar**.

### Conclusión

`proyecciones_f29` guarda el **resultado**.
`transacciones` debería guardar el **detalle**, pero le faltan 3 campos clave.
Sin `transacciones` completa, `proyecciones_f29` es un número sin respaldo.

---

## 4. El problema de volumen

Los límites que el propio frontend se impone, en `validateDatabase()`:

```ts
d.projections.length > 6000     // hasta 6.000 proyecciones
s.rows.length > 20000           // hasta 20.000 filas por archivo
```

Y en `folderFiles()`:

```ts
if (files.length > 2000) throw new Error('Selecciona una carpeta con menos de 2.000 CSV.');
```

**Ejemplo real:** una carpeta con 1.500 comprobantes genera 1.500 objetos `Row`
(cada uno con 10 campos, incluyendo 3 strings) serializados dentro del mismo
JSON. Multiplicado por varios clientes, el límite típico de `localStorage`
(~5 MB) se supera.

**Consecuencia:** con volumen realista, la proyección deja de guardarse y el
usuario cree que sí, porque no hay error visible hasta que la cuota se agota.

---

## 5. Lo que falta, en concreto

| # | Falta | Prioridad |
| --- | --- | --- |
| 1 | **Módulo NestJS `src/f29/`** — no existe. `app.module.ts` solo registra Auth, Clientes, Servicios, Documentos | Alta |
| 2 | **Endpoints** — ninguno: ni listar, ni guardar, ni calcular | Alta |
| 3 | **`folio` y `tipo_documento` en `transacciones`** — sin ellos no hay deduplicación | Alta |
| 4 | **Migración ejecutable** — no hay `migration.sql`; la tabla existe en el contrato, no en la base | Alta |
| 5 | **Relación directa `cliente_id`** en la proyección (hoy hay que pasar por `periodo_id`) | Media |
| 6 | **`@unique([periodoId, version])`** — hoy el versionado no está garantizado por el esquema | Media |
| 7 | **Endpoint de PDF** — para que `documento_generado` tenga sentido; hoy el PDF se arma en el navegador (`report.ts`) | Media |
| 8 | **Concurrencia** — el `revision` del frontend no tiene equivalente en el backend | Media |
| 9 | **Auditoría** — quién generó y quién revisó; las columnas existen, el flujo no | Media |

---

## 6. Lo que sí está bien resuelto

No todo está por hacer. Estas decisiones conviene conservarlas:

- **`periodo_id` como eje.** La proyección cuelga de un período del cliente, lo
  que evita duplicar cliente y mes en cada fila.
- **`documento_generado` apunta a `documentos`.** La intención de emitir el PDF
  y asociarlo a la proyección ya está en el esquema.
- **`generado_por` / `revisado_por` separados.** Distingue quién calculó de
  quién validó, que es el flujo real de una proyección tributaria.
- **`Numeric(14,2)`** en todos los montos: evita los errores de coma flotante
  que sí afectarían al dinero.
- **Validación estricta del lado del cliente** (`validateDatabase`): RUT
  verificado con dígito verificador, montos acotados a enteros seguros, límites
  de tamaño, detección de duplicados. Ese trabajo no se pierde, se traslada.

---

## 7. Orden de trabajo propuesto

### Paso 1 — Cerrar el hueco del modelo

Agregar a `transacciones` lo que falta para representar un documento RCV:

```prisma
folio             VarChar(50)    // clave de deduplicación
tipoDocumento     VarChar(20)    // 33, 34, 39, 41, 46, 56, 61
rutContraparte    VarChar(20)    // RUT del proveedor o cliente
nombreContraparte VarChar(180)
```

Con un `@unique([periodoId, folio, tipoDocumento, direccion])` que replique la
deduplicación que hoy hace el frontend.

### Paso 2 — Migración

Crear el `migration.sql` con las 14 tablas del contrato. Sin esto no hay entorno
reproducible, y bloquea los pasos siguientes.

### Paso 3 — Módulo `src/f29/`

Siguiendo el patrón de `documentos/`:

| Ruta | Función |
| --- | --- |
| `GET /f29?clienteId=&periodo=` | Listar proyecciones |
| `POST /f29` | Guardar una proyección |
| `POST /f29/:id/documentos` | Carga masiva de filas RCV |
| `GET /f29/:id/reporte` | Generar el PDF y registrarlo en `documentos` |

### Paso 4 — Mover el cálculo

`calculate()` y `report.ts` están en el frontend. La opción más limpia es que el
backend sea la autoridad del cálculo y el frontend solo muestre. Esto evita que
dos clientes distintos calculen proyecciones distintas.

---

## 8. Cómo verificar este documento

```powershell
# ¿existe algún módulo F29 en el backend?
cmd /c "dir /b tributek\backend\src\f29"
# → error: no existe la carpeta

# ¿proyecciones_f29 aparece en código de aplicación (fuera del contrato)?
Select-String -Path tributek/backend/src/auth/*.ts,tributek/backend/src/clientes/*.ts,tributek/backend/src/documentos/*.ts,tributek/backend/src/servicios/*.ts -Pattern "ProyeccionF29"
# → sin resultados

# ¿el frontend envía algo al backend desde F29?
Select-String -Path tributek/frontend/app/components/f29/*.tsx,tributek/frontend/app/components/f29/*.ts -Pattern "authenticatedFetch"
# → 2 coincidencias en F29Workspace.tsx: línea 7 (el import) y línea 139 (la llamada)
# → la única llamada es GET /clientes: solo lectura, nunca envía una proyección

# ¿qué módulos declara el backend?
Select-String -Path tributek/backend/src/app.module.ts -Pattern "Module"
# → Auth, Clientes, Servicios, Documentos. No hay F29.
```

---

## 9. Documentos relacionados

- [Evaluación del backend y la base de datos](README.md): panorama general de
  los problemas críticos, de los cuales el F29 es uno.
- [Panel Cliente — Introducción](../panel-cliente/introduccion.md)
- [Módulos y rutas de la API](referencia/modulos-api.md)

## Convenciones

La fuente del contrato es `backend/prisma/contract.prisma`. `contract.json` y
`contract.d.ts` son artefactos emitidos: modifica el contrato fuente y vuelve a
emitirlos, no edites los generados manualmente.


## lo que se modifico del F29, BD, BACKEND, ARCHHIVOS..