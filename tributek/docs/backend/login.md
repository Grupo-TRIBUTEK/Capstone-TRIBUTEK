# Implementación de verificación de contraseña

Se incorporó **Argon2** al módulo de autenticación para verificar la contraseña ingresada durante el inicio de sesión.

## 1. Instalación

Se instaló la dependencia `argon2`:

```powershell
npm install argon2
```

## 2. Verificación de contraseña

En `auth.service.ts` se utiliza `argon2.verify()` para comparar la contraseña ingresada por el usuario con el `passwordHash` almacenado en PostgreSQL.

```ts
const passwordValida = await argon2.verify(
  usuario.passwordHash,
  loginDto.password,
);
```

Si la contraseña no coincide, se devuelve un error `401 Unauthorized`.

```ts
if (!passwordValida) {
  throw new UnauthorizedException('Usuario o contraseña incorrectos');
}
```

## Estado actual

El proceso de autenticación actualmente realiza:

1. Buscar el usuario por `nombreUsuario`.
2. Comprobar que el usuario exista.
3. Comprobar que la cuenta esté activa.
4. Verificar la contraseña mediante Argon2.

La generación del **JWT** y la creación de usuarios de prueba quedan para las siguientes etapas.
