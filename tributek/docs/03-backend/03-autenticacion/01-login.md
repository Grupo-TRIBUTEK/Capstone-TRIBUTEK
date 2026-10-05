# Inicio de sesión y sesión JWT

El controlador de autenticación publica `POST /auth/login`. El cliente envía
`nombreUsuario` y `password`; el valor de `nombreUsuario` puede ser un nombre
de usuario o un correo electrónico.

```json
{
  "nombreUsuario": "usuario-o-correo",
  "password": "<contraseña>"
}
```

## Flujo implementado

1. `AuthService` recorta el identificador y, si contiene `@`, lo normaliza a
   minúsculas.
2. Busca primero por `nombreUsuario`; si no encuentra la cuenta y el valor
   contiene `@`, busca por `email`.
3. Rechaza una cuenta inexistente o inactiva.
4. Compara la contraseña recibida con `passwordHash` mediante Argon2.
5. Obtiene el nombre del rol, firma un JWT y responde con `access_token` y los
   datos básicos del usuario (`id`, `nombreUsuario`, `rolId`, `rolNombre`).

Las credenciales incorrectas producen `401 Unauthorized`. La respuesta no
devuelve el hash de la contraseña. La expiración del JWT está configurada en
`AuthModule` como una hora; `JWT_SECRET` debe estar definido en el entorno.

## Uso del token

El frontend guarda el token en `localStorage` y lo envía en las solicitudes
protegidas mediante:

```text
Authorization: Bearer <access_token>
```

`GET /auth/perfil` requiere JWT. `GET /auth/admin` requiere JWT y el rol
`ADMIN` (también acepta el identificador numérico `1`). El guard de roles admite
el nombre `ADMINISTRADOR` como equivalente de `ADMIN`.

El formulario del frontend redirige a `/admin` para `ADMIN`/`ADMINISTRADOR` y a
`/cliente` para `CLIENTE`. Esa navegación no reemplaza la autorización que
deben aplicar las rutas del backend; consulta el [mapa de API](../referencia/modulos-api.md).

## Límites de validación

`LoginDto` solo declara los campos `nombreUsuario` y `password`; no tiene
decoradores de `class-validator`. No documentamos validaciones de formato o
longitud para el login que no estén implementadas en el servidor.

Las cuentas y contraseñas dependen de los datos de cada base local. No hay una
cuenta de prueba ni una contraseña compartida definida en esta guía.
