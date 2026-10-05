# 04 · Autorización en `/documentos`

> **Propósito:** describir el plan paso a paso para cerrar la brecha de
> autorización en las rutas de documentos, con la verificación exacta que
> confirma cada paso.
>
> [modulos-api.md](modulos-api.md) advierte que la política por rol y cliente
> para listar o descargar documentos no está declarada; este documento la
> define.

## 1. Estado actual

`src/documentos/documentos.controller.ts` aplica `JwtAuthGuard` a toda la clase
pero **no** declara `RolesGuard` en ninguna ruta:

```ts
@Controller('documentos')
@UseGuards(JwtAuthGuard)   // ← solo autenticación, sin autorización
export class DocumentosController {
```

**Impacto:** hoy cualquier usuario con un JWT válido —incluida una cuenta con
rol `CLIENTE`— puede listar los documentos de **todos** los clientes y descargar
cualquier archivo por ID (`GET /documentos/:id/descargar`).

Además, el campo `visibleCliente` existe en `documentos` y se escribe siempre en
`false` al cargar (`documentos.service.ts`, línea 94), pero **ninguna consulta
lo lee para filtrar**. La flag está en el esquema y se ignora en el código.

---

## 2. Paso A — Cerrar la fuga (_roles_)

### 2.1 Qué hace

Agrega el control de roles que falta, replicando el patrón ya usado en
`ClientesController` y `GET /auth/admin`. No toca la lógica de negocio: solo
quién puede entrar a cada ruta.

### 2.2 Cambios

**Archivo:** `src/documentos/documentos.controller.ts`

1. Importar el guard y el decorador ya existentes:

```ts
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
```

2. Proteger **por ruta**, no por clase:

```ts
@Get()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 1)
listar(@Query() filters: {...}) {
  return this.documentosService.listar(filters);
}

@Get('tipos-sugeridos')
tiposSugeridos() { ... }   // sin cambios: sigue exigible solo JWT

@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 1)
@UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 10 * 1024 * 1024 } }))
cargar(@UploadedFile() file: any, @Body() data: any, @Req() request: any) {
  return this.documentosService.cargar(file, data, request.user.id);
}

@Get(':id/descargar')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 1)
async descargar(@Param('id') id: string) { ... }
```

Por qué por ruta y no por clase:

- `tipos-sugeridos` es inocuo y se usa en formularios; no necesita rol.
- Queda explícito qué exige cada endpoint, igual que en `clientes.controller.ts`.

Cómo funciona el guard (`src/auth/roles.guard.ts`):

- Si la ruta no tiene `@Roles()`, permite el acceso (líneas 20-23).
- Compara `usuario.rolNombre` en mayúsculas con el rol exigido; admite el alias
  `ADMINISTRADOR` para `ADMIN` (líneas 30-36).
- Si no coincide, lanza `ForbiddenException` → HTTP 403 (líneas 38-42).

> **Ojo con el orden de las rutas:** `@Get('tipos-sugeridos')` debe seguir antes
> de `@Get(':id/descargar')`. Si se invierte, `tipos-sugeridos` se interpreta
> como un `:id`.

### 2.3 Compilar

```powershell
cd tributek/backend
npm run build
```

Esperado: sin errores de TypeScript.

### 2.4 Probar

Levantar el servidor:

```powershell
npm run start:dev
```

En otra terminal, obtener tokens (reemplazar usuario y contraseña):

```powershell
$admin = Invoke-RestMethod -Method Post -Uri http://localhost:3001/auth/login `
  -ContentType 'application/json' `
  -Body '{"nombreUsuario":"TU_ADMIN","password":"TU_PASSWORD"}'
$tokenAdmin = $admin.access_token

$cliente = Invoke-RestMethod -Method Post -Uri http://localhost:3001/auth/login `
  -ContentType 'application/json' `
  -Body '{"nombreUsuario":"TU_CLIENTE","password":"TU_PASSWORD"}'
$tokenCliente = $cliente.access_token
```

### 2.5 Checklist de verificación del Paso A

| # | Prueba | Esperado |
|---|---|---|
| 1 | `GET /documentos` sin token | `401` |
| 2 | `GET /documentos` como ADMIN | `200` con lista |
| 3 | `GET /documentos` como CLIENTE | **`403`** ← la prueba clave |
| 4 | `POST /documentos` como CLIENTE | `403` |
| 5 | `GET /documentos/:id/descargar` como CLIENTE | `403` |
| 6 | `GET /documentos/tipos-sugeridos` como CLIENTE | `200` |

Pruebas 2 y 3 (cambiar el token según el caso):

```powershell
Invoke-RestMethod -Uri http://localhost:3001/documentos `
  -Headers @{ Authorization = "Bearer $tokenAdmin" }
```

Si la prueba 3 devuelve `200`, el paso **no está bien hecho**: el guard no se
está aplicando.

---

## 3. Paso B — Aislamiento por cliente (+ `visibleCliente`)

### 3.1 Qué agrega

El Paso A cierra "solo los admins entran". El Paso B responde **"a cuáles"**:
un `CLIENTE` solo ve los documentos de los clientes vinculados a su cuenta en
`usuario_cliente`, y solo si `visible_cliente` es verdadero.

### 3.2 Datos previos (ya verificados en código)

El payload JWT ya incluye lo necesario (`auth.service.ts`, líneas 165-171):

```ts
const payload = {
  sub: usuario.id.toString(),
  nombreUsuario: usuario.nombreUsuario,
  rolId: usuario.rolId.toString(),
  rolNombre,
};
```

- `sub` → resuelve los vínculos en `usuario_cliente` sin consultar de más.
- `rolNombre` → distingue ADMIN de CLIENTE sin una consulta extra.
- `login()` rechaza cuentas con `activo: false` (líneas 142-145), por lo que un
  `CLIENTE` autenticado siempre está activo.

Y `obtenerMisClientes()` (`clientes.service.ts`, línea 144) ya implementa el
patrón de resolución de vínculos que el Paso B replica:

```ts
const vinculos = await this.prisma.db.orm.public.UsuarioCliente
  .where({ usuarioId: usuario.id })
  .all();
```

### 3.3 Cambios

**1. Resolver los clientes visibles.** En `documentos.service.ts`, agregar un
método que devuelva los IDs de cliente de un usuario:

```ts
async clientesVinculados(usuarioId: string): Promise<bigint[]> {
  const vinculos = await this.prisma.db.orm.public.UsuarioCliente
    .where({ usuarioId: BigInt(usuarioId) })
    .all();
  return vinculos.map((v: any) => v.clienteId);
}
```

**2. Distinguir admin de cliente.** Helper usado por listar y descargar:

```ts
private esAdmin(rolNombre?: string) {
  return ['ADMIN', 'ADMINISTRADOR'].includes(String(rolNombre ?? '').toUpperCase());
}
```

Usar las mismas dos variantes que `roles.guard.ts` (líneas 33-35) para no crear
un criterio distinto al del guard.

**3. Filtrar en `listar()`.** Pasar `request.user` desde el controlador y
aplicar el filtro solo si no es admin:

```ts
async listar(filters, usuario: { id: string; rolNombre?: string }) {
  // ...carga actual de documentos, clientes, periodos y tipos...
  let documentos = /* resultado actual */;

  if (!this.esAdmin(usuario.rolNombre)) {
    const permitidos = await this.clientesVinculados(usuario.id);
    const ids = new Set(permitidos.map(String));
    documentos = documentos.filter((d) =>
      ids.has(String(d.clienteId)) && d.visibleCliente === true
    );
  }
  return documentos /* + mapeo y filtros existentes */;
}
```

Dos condiciones a la vez: **ser de su cliente Y estar marcado visible**.

**4. Proteger `descargar()` con la misma lógica.** Verificar propiedad antes de
abrir el stream:

```ts
async descargar(id: string, usuario: { id: string; rolNombre?: string }) {
  const documento = await this.prisma.db.orm.public.Documento
    .where({ id: BigInt(id) }).first();
  if (!documento) throw new NotFoundException('Documento no encontrado.');

  if (!this.esAdmin(usuario.rolNombre)) {
    const permitidos = await this.clientesVinculados(usuario.id);
    const esSuyo = permitidos.some((c) => String(c) === String(documento.clienteId));
    if (!esSuyo || documento.visibleCliente !== true) {
      throw new NotFoundException('Documento no encontrado.');
    }
  }

  return { documento, stream: await this.storage.open(documento.urlArchivo) };
}
```

> Usar `NotFoundException` (404), no `ForbiddenException` (403). Un 403 confirma
> que el documento existe, lo que permite enumerar IDs; con 404 el atacante no
> distingue "no existe" de "no es tuyo".

**5. Hacer configurable la visibilidad al cargar.** Hoy `cargar()` escribe
siempre `visibleCliente: false`, así que un documento cargado **nunca** sería
visible para el cliente. Agregar el campo al formulario:

```ts
visibleCliente: data.visibleCliente === 'true' || data.visibleCliente === true,
```

El valor por defecto sigue siendo no visible; el admin lo habilita de forma
explícita cuando el documento está listo para el portal.

### 3.4 Checklist de verificación del Paso B

Prerrequisito: un usuario CLIENTE con al menos un cliente vinculado y un
documento de ese cliente con `visible_cliente = true` en la base.

| # | Prueba | Esperado |
|---|---|---|
| 1 | ADMIN lista documentos | Ve **todos** |
| 2 | CLIENTE lista documentos | Solo los de su cliente |
| 3 | Cliente vinculado a 2 clientes | Ve documentos de **ambos** |
| 4 | Documento con `visible_cliente = false` | El cliente **no lo ve**, el ADMIN sí |
| 5 | ADMIN descarga doc de cualquier cliente | `200` |
| 6 | CLIENTE descarga doc de otro cliente | **`404`** |
| 7 | CLIENTE descarga doc suyo visible | `200` |
| 8 | CLIENTE descarga doc suyo no visible | `404` |

Para alternar la visibilidad en pruebas:

```sql
UPDATE documentos SET visible_cliente = true WHERE id = <id>;
```

### 3.5 Orden de commits

Son dos commits separados a propósito: si B tiene un problema, A ya está
protegido y se puede revertir sin perder la cobertura.

```
commit 1 → Paso A (guards por ruta)      → pruebas 1-6
commit 2 → Paso B (filtro por cliente)   → pruebas 1-8
```

---

## 4. Documentos relacionados

| Documento | Relación |
|---|---|
| [modulos-api.md](modulos-api.md) | Mapa de rutas; advierte que la política no estaba definida |
| [../README.md](../README.md) | Diagnóstico del hueco (Crítico 2) y propuesta de fases |
| [../../panel-cliente/introduccion.md](../../panel-cliente/introduccion.md) | Requisito de permisos que esto desbloquea |