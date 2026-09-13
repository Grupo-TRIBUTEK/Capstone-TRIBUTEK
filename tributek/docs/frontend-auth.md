# Integración de autenticación frontend-backend

## Implementación

- Se reutilizó la pantalla existente `/login` y su componente `LoginForm`.
- El formulario envía `nombreUsuario` y `password` a `POST /auth/login`.
- El `access_token` se guarda en `localStorage`.
- Las peticiones protegidas envían `Authorization: Bearer <TOKEN_JWT>`.
- La vista `/admin` valida la sesión mediante `/auth/perfil` y el permiso ADMIN mediante `/auth/admin`.
- Se agregó logout y manejo de errores de credenciales o token inválido.

## Archivos modificados y creados

- `frontend/next.config.ts`: proxy de `/auth/*` hacia `http://localhost:3001/auth/*`.
- `frontend/app/features/auth/auth-client.ts`: login, token, validación y logout.
- `frontend/app/components/features/auth/LoginForm.tsx`: envío y mensajes de error.
- `frontend/app/admin/layout.tsx`: protección de `/admin`.
- `frontend/app/components/layout/Sidebar.tsx`: cierre de sesión.

## Flujo

1. El usuario inicia sesión en `/login`.
2. El frontend llama a `POST /auth/login` y recibe un JWT.
3. Guarda el token y verifica que `rolId` sea `1`.
4. `/admin` valida el token con `/auth/perfil` y el permiso con `/auth/admin`.
5. Si el token es inválido, expiró o el usuario no es ADMIN, se elimina la sesión y se redirige a `/login`.

## Endpoints utilizados

- `POST /auth/login`
- `GET /auth/perfil`
- `GET /auth/admin`

## Pruebas

- `npm run build`: correcto después de integrar la autenticación.
- `npx eslint app next.config.ts`: sin errores; queda una advertencia previa sobre el uso de `<img>`.
- Login válido con `admin`: redirige a `/admin` y permite mostrar el panel.
- Login inválido: el backend responde `401` y el frontend muestra un mensaje de error.
- Acceso a `/admin` sin sesión: redirige a `/login`.
- Logout: elimina la sesión y redirige a `/login`.
- Se verificó que el proxy evita la llamada directa entre orígenes y no requiere modificar el backend.
- El flujo funcional requiere backend activo en `http://localhost:3001` y frontend activo en su puerto de Next.js.

## Problemas y soluciones

- El formulario original enviaba a `/api/auth/login` y usaba el campo `email`; se conectó a `/auth/login` usando `nombreUsuario`.
- El navegador podía bloquear una llamada directa entre puertos; se agregó un rewrite de Next.js para mantener las peticiones bajo el origen del frontend.
- El backend valida el rol ADMIN mediante `/auth/admin`; por eso el frontend valida `/auth/perfil` y luego `/auth/admin` antes de mostrar `/admin`.

No se incluyen tokens JWT reales en esta documentación; se utiliza `<TOKEN_JWT>`.