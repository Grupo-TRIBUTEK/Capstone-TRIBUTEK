# Introducción al backend de TRIBUTEK

> Para quien quiera entender **por qué** el backend está organizado así y qué
> hace cada pieza, sin entrar al código todavía.

El backend es una API hecha con **NestJS** que corre en el puerto `3001`. El
frontend le pide datos y el backend los trae de una base **PostgreSQL**. Entre
medio hay una capa de seguridad que decide quién puede pedir qué.

## Las carpetas (`backend/src/`)

Cada carpeta es un **módulo**: una parte del sistema que se encarga de un tema.

| Carpeta | De qué se encarga |
|---|---|
| `auth/` | Entrar al sistema: login, contraseñas y permisos |
| `clientes/` | Los clientes y quién puede ver cada uno |
| `servicios/` | Los servicios que se venden y a quién se asignan |
| `documentos/` | Subir, listar y descargar archivos |
| `gestiones/` | Pasos y progreso de formalización de cada cliente (agregado 2026-10) |
| `prisma/` | La conexión con la base de datos |
| `usuario/` | Vacía por ahora, reservada para más adelante |

## Cómo está armado un módulo (el patrón NestJS)

Todos los módulos siguen la misma receta con **cuatro** piezas (ejemplo real:
`gestiones/`, el más reciente):

| Pieza | Archivo | Qué hace |
|---|---|---|
| **Controller** | `gestiones.controller.ts` | Recibe la petición HTTP y dice qué ruta la atiende. No toca la base: solo pasa la papelea al service. |
| **DTO** | `dto/guardar-formalizacion.dto.ts` | El "formulario" tipado del body. Valida lo que llega antes de que nadie lo use (campos obligatorios, tamaños). Si llega algo raro, responde `400` sin llegar al service. |
| **Service** | `gestiones.service.ts` | Hace el trabajo: aplica reglas de negocio y consulta la base con Prisma. |
| **Module** | `gestiones.module.ts` | Declara qué piezas pertenecen juntas (controller + service). |

El recorrido de un dato:

```
petición → controller (lee el DTO) → service → Prisma → PostgreSQL
```

Ejemplo concreto: `PUT /gestiones/formalizacion/19` → el controller valida el body
con `GuardarFormalizacionDto` → el service reescribe cabecera + 11 pasos en una
transacción → Prisma guarda en la tabla `gestiones`. El **controller** nunca toca
la base directo: esa separación sirve para cambiar una regla de negocio sin tocar
las rutas, y viceversa.

El módulo raíz (`app.module.ts`) junta todo: Auth, Prisma, Clientes, Servicios,
Documentos y Gestiones.

## Qué es JWT y por qué se usa

**JWT** (JSON Web Token) es como un **pase sellado**: cuando entras con tu
usuario y contraseña, el backend te entrega un texto firmado que dice quién
eres y qué rol tienes. En cada petición siguiente mandas ese pase en el
encabezado:

```
Authorization: Bearer <tu pase>
```

El backend verifica el sello con una clave secreta (`JWT_SECRET`) sin tener que
preguntarle a la base quién eres cada vez. Dura **1 hora** y después hay que
entrar de nuevo.

Dentro del pase viaja: tu `id`, tu `nombreUsuario`, tu `rolId` y tu
`rolNombre`. Eso es lo que usan los permisos.

## Qué es Argon2 y por qué se usa

**Argon2** es el algoritmo que protege las contraseñas. Cuando creas tu clave,
el backend **no la guarda**: guarda un **hash**, un texto irreversible derivado
de tu clave con una "sal" aleatoria.

Al entrar, el backend calcula el hash de lo que escribiste y lo compara con el
guardado. Si alguien roba la base de datos, solo ve hashes inútiles, nunca las
claves reales.

## Los dos porteros: JwtAuthGuard y RolesGuard

Cada petición protegida pasa por dos revisiones, en este orden:

```
petición → JwtAuthGuard → RolesGuard → controller → service → base de datos
```

| Portero | Pregunta que responde | Si la respuesta es no |
|---|---|---|
| `JwtAuthGuard` | ¿Tu pase (JWT) es válido? | `401` — no entras |
| `RolesGuard` | ¿Tu rol alcanza para esta ruta? | `403` — entraste, pero aquí no |

**JwtAuthGuard** revisa el sello del pase y deja tus datos en la petición para
que los use el resto. No sabe nada de roles.

**RolesGuard** lee lo que la ruta exige. El patrón actual: `JwtAuthGuard` se pone
**una sola vez a nivel de controller** y `RolesGuard` en cada ruta con roles:

```ts
@Controller('gestiones')
@UseGuards(JwtAuthGuard)      // todo el controller requiere pase válido
...
@Get()
@UseGuards(RolesGuard)        // esta ruta además exige rol
@Roles('ADMIN', 1)
```

Si la ruta no tiene `@Roles(...)`, pasa cualquiera con pase válido. Si lo
tiene, compara tu rol: por número (`rolId`) o por nombre (`rolNombre`). El rol
`ADMIN` también acepta el alias `ADMINISTRADOR`.

## Quién puede qué (resumen)

| Módulo | Estado |
|---|---|
| `auth` | Entrar (`login`) es público; `perfil` pide pase; `admin` pide pase + rol |
| `clientes` | Todo con pase + rol (`ADMIN` para gestionar, `CLIENTE` para lo suyo) |
| `documentos` | Listar, subir y descargar con pase + rol `ADMIN` |
| `gestiones` | Todo con pase + rol `ADMIN` (lectura y guardado de formalizaciones) |
| `servicios` | Solo pide pase, falta control de roles |

## Los archivos de datos

La base se describe en un solo archivo editable:

| Archivo | Qué es |
|---|---|
| `prisma/contract.prisma` | El modelo: las tablas y sus relaciones (se edita a mano) |
| `contract.json`, `contract.d.ts` | Generados automáticamente. No se editan |
| `migrations/app/.../` | Los paquetes que llevaron el modelo a la base real (baseline + `20261006T0517` de gestiones) |

## Para seguir leyendo

- [Login y JWT](../03-autenticacion/01-login.md) — el flujo de entrada en detalle
- [Autorización en documentos](../04-referencia/04-autorizacion-documentos.md) —
  cómo se cerraron los permisos, con pruebas
- [Evaluación del backend](../README.md) — el diagnóstico completo del estado
