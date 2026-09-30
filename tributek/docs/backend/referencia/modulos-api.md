# Módulos y rutas de la API

Este mapa se basa en los controladores registrados por `src/app.module.ts`.
Las rutas no llevan un prefijo global adicional en `main.ts`.

## Autenticación — `/auth`

| Método y ruta | Acceso declarado | Función |
| --- | --- | --- |
| `POST /auth/login` | Público | Valida credenciales y devuelve JWT y datos básicos del usuario. |
| `POST /auth/activar-cuenta` | Token de activación/restablecimiento | Define o restablece la contraseña de una cuenta cliente. |
| `GET /auth/perfil` | JWT | Comprueba que el token sea válido. |
| `GET /auth/admin` | JWT + rol `ADMIN` o ID `1` | Comprueba acceso administrativo. |

## Clientes — `/clientes`

Las rutas de esta tabla declaran `JwtAuthGuard` y `RolesGuard`.

| Método y ruta | Rol requerido | Función |
| --- | --- | --- |
| `POST /clientes` | `ADMIN` o ID `1` | Crear cliente. |
| `PATCH /clientes/:id` | `ADMIN` o ID `1` | Actualizar cliente y opciones de acceso al portal. |
| `POST /clientes/:id/acceso-portal/enlace` | `ADMIN` o ID `1` | Generar un nuevo enlace de invitación. |
| `POST /clientes/:id/acceso-portal/restablecimiento` | `ADMIN` o ID `1` | Generar un enlace de restablecimiento. |
| `GET /clientes/:id/acceso-portal` | `ADMIN` o ID `1` | Consultar el acceso al portal del cliente. |
| `GET /clientes/mis-clientes` | `CLIENTE` | Obtener los clientes vinculados a la cuenta autenticada. |
| `GET /clientes` | `ADMIN` o ID `1` | Listar clientes; acepta `buscar` como query param. |
| `GET /clientes/:id` | `ADMIN` o ID `1` | Obtener un cliente. |

## Servicios — `/servicios`

Todas las rutas declaran `JwtAuthGuard`. El controlador no declara un guard de
roles por ruta.

| Método y ruta | Función |
| --- | --- |
| `GET /servicios` | Listar servicios; acepta `buscar`. |
| `POST /servicios` | Crear servicio. |
| `PATCH /servicios/:id` | Actualizar servicio. |
| `GET /servicios/asignaciones` | Listar asignaciones cliente-servicio. |
| `POST /servicios/asignaciones` | Crear asignación. |
| `PATCH /servicios/asignaciones/:id` | Actualizar asignación. |
| `PATCH /servicios/asignaciones/:id/finalizar` | Finalizar asignación. |

## Documentos — `/documentos`

Todas las rutas declaran `JwtAuthGuard`. El controlador no declara un guard de
roles por ruta.

| Método y ruta | Función |
| --- | --- |
| `GET /documentos` | Listar y filtrar metadatos de documentos. |
| `GET /documentos/tipos-sugeridos` | Devolver tipos sugeridos. |
| `POST /documentos` | Cargar un documento como multipart/form-data; campo `archivo`, máximo 10 MiB. |
| `GET /documentos/:id/descargar` | Descargar el archivo asociado al documento. |

La implementación guarda los bytes localmente en `uploads/documentos` y guarda
la clave y otros metadatos en PostgreSQL. La política por rol y cliente para
listar o descargar documentos no está declarada en `DocumentosController`;
defínela y verifícala antes de considerar estas rutas listas para el Portal
Cliente.

## Rutas aún no registradas

`src/usuario/` contiene archivos vacíos para controller y module, y
`AppModule` no importa `UsuarioModule`. Por ahora no hay endpoints de usuario
que deban añadirse a este mapa.

`GET /` es el controlador base de NestJS y responde `Hello World!`; no equivale
a una comprobación de salud que verifique PostgreSQL o dependencias externas.
