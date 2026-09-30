# Hash y verificación de contraseñas

El backend usa la dependencia `argon2`, declarada en
`tributek/backend/package.json`. Las contraseñas se guardan en el campo
`passwordHash` del modelo `Usuario`; no se guardan como texto plano.

## Al iniciar sesión

`AuthService.login()` llama a `argon2.verify()` con el hash de la base de datos
y la contraseña recibida. Argon2 comprueba si coinciden; no descifra ni revela
el valor original.

```ts
const passwordValida = await argon2.verify(
  usuario.passwordHash,
  loginDto.password,
);
```

Si la comprobación falla, el login responde con `401 Unauthorized`.

## Activación o restablecimiento del portal

`POST /auth/activar-cuenta` valida un token de activación o restablecimiento,
comprueba que las contraseñas coincidan y que tengan al menos 10 caracteres,
genera un nuevo hash con `argon2.hash()` y activa la cuenta. Esa longitud mínima
corresponde a este flujo; no está implementada como regla del endpoint de login.

No incluyas hashes, contraseñas reales ni credenciales de prueba en esta
documentación o en Git. Para conocer las rutas relacionadas, consulta el
[mapa de API](../referencia/modulos-api.md).
