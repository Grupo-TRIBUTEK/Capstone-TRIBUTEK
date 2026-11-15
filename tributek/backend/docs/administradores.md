# Administradores de TRIBUTEK

## Alcance

Solo la cuenta cuyo ID está en ADMIN_MANAGER_USER_ID puede consultar y crear administradores. El servidor vuelve a consultar su estado activo y rol en cada solicitud. El nombre de usuario no concede este permiso. Una cuenta nueva recibe un rol administrativo existente, sin heredar el permiso de creación.

La pantalla aparece en el menú después de consultar GET /administradores/permisos. Entrar directamente a la URL o invocar POST /administradores no evita la comprobación del servidor. Crear una cuenta requiere el aviso Acción solicitada. No incluye edición, eliminación ni restablecimiento de otras cuentas.

## Configuración local

Desde tributek/backend ejecutar:

    node scripts/configurar-admin-principal.mjs

El script comprueba que admin sea una cuenta administrativa activa y que ConstanzaS no corresponda a otra cuenta. Cambia exclusivamente el nombre de acceso a ConstanzaS, conserva ID, hash de contraseña e historial y registra el cambio en auditoría. Es idempotente y puede ejecutarse de nuevo. Obtiene el ID real de la cuenta y escribe ADMIN_MANAGER_USER_ID en backend/.env. No usa un ID predeterminado.

El respaldo privado de configuración se guarda en backend/.tmp/env-antes-administradores, dentro de una carpeta ignorada por Git. No compartir este respaldo. Reiniciar el backend y cerrar y volver a abrir sesión con ConstanzaS y la misma contraseña.

## Acuerdo de integración con Brandon

No se modifican src/auth, el esquema Prisma, las tablas ni el flujo de login. Se reutiliza JwtAuthGuard y request.user.id, que debe seguir siendo el ID estable de Usuario. La autenticación y el 2FA continúan a cargo de Brandon. Antes de habilitar 2FA, su guard debe aceptar únicamente sesiones finales y rechazar tokens de desafío, activación o recuperación. Este módulo no resuelve desafíos TOTP ni declara que el 2FA esté integrado.

El módulo no añade excepciones al chatbot. La creación de cuentas sigue fuera del alcance permitido para el asistente.

Archivos compartidos de integración: backend/src/app.module.ts, frontend/next.config.ts y frontend/app/components/layout/Sidebar.tsx. El resto del trabajo está en archivos nuevos de administradores y el script local. Si Brandon modifica esos tres archivos antes de aplicar la actualización, el instalador se detendrá para evitar sobrescribirlo.

## Datos y seguridad

Campos: nombre, usuario, correo y contraseña confirmada. Contraseña de 12 a 128 caracteres, guardada con Argon2id. No se devuelven hashes ni contraseñas. El rol lo determina el servidor. La creación y el evento de auditoría se guardan en una misma transacción. La bitácora no contiene la contraseña ni el correo. No se crean cuentas de prueba en la base real.

No se modifica el permiso principal desde la interfaz. Para cambiar de responsable se necesita acceso operativo al archivo de entorno del servidor.

## Verificación

12 pruebas correctas, incluida la inicialización del módulo con Passport del módulo. Compilación del código de producción del backend y comprobación de tipos del frontend correctas. ESLint de los componentes nuevos y archivos de integración correcto. La comprobación general de tipos que incluye migraciones y pruebas antiguas encuentra errores previos ajenos al módulo. No se ejecutó una prueba de creación contra la base real ni una revisión visual en navegador.

Para repetir las pruebas:

    cd tributek/backend
    npm test -- src/administradores/administradores.service.spec.ts

Comprobación funcional local después de configurar: iniciar sesión con ConstanzaS, abrir Administradores, registrar una cuenta de prueba solo si se necesita y comprobar su evento en Trazabilidad. Entrar con esa cuenta nueva debe permitir el panel administrativo y denegar la gestión de administradores.

## Integración con el 2FA de Brandon, 15 de noviembre de 2026

El código de feature/doble-auth ya se encuentra en main y fue incorporado manteniendo el historial. La gestión de administradores reutiliza la sesión definitiva que emite /auth/2fa/verify. Los tokens de desafío se rechazan en las rutas protegidas. La cuenta principal real continúa siendo ConstanzaS, ID 1, con su contraseña anterior y sin activar automáticamente su segundo factor.

Se aplicó y verificó el esquema de las dos migraciones aditivas de 2FA en la base local de desarrollo. Antes se guardó un respaldo de PostgreSQL y del entorno en backend/.tmp. Se generaron claves locales nuevas porque no existían secretos 2FA previos. No se copiaron claves desde capturas ni desde la base de otra persona. Las claves del entorno deben conservarse al respaldar esta instalación.

La creación de administradores asigna el rol desde el servidor y conserva el permiso de creación exclusivamente en el ID principal. Las cuentas nuevas pueden configurar su propio 2FA en Seguridad. El módulo no concede al chatbot permiso para crear usuarios.

Los eventos de generación de configuración, activación, desactivación e ingreso completado mediante 2FA se muestran en Trazabilidad. No se registran contraseñas, secretos TOTP, QR ni códigos de recuperación. La pantalla mantiene los avisos Acción solicitada antes de modificar la protección.

Se corrigió además el reemplazo de un segundo factor ya activo mediante setup o confirm y se limpia la sesión anterior del navegador cuando comienza un nuevo intento de ingreso.

La evidencia de integración corresponde a una base temporal sin datos personales, eliminada después de las pruebas. Incluyó creación administrativa, separación de permisos, ingreso con TOTP, recuperación de un solo uso y auditoría. La cuenta real de Constanza no se usó para activar o desactivar 2FA durante las pruebas.

Para activar la cuenta real: iniciar sesión con ConstanzaS, entrar en Seguridad, generar QR usando la contraseña actual, escanearlo con Authenticator, confirmar con su código vigente y guardar los códigos de recuperación. Esto requiere el dispositivo de la titular.

Limitación heredada de la implementación: los desafíos y el control de intentos y reutilización TOTP se mantienen en memoria para una única instancia. Reiniciar el backend invalida los desafíos pendientes. El despliegue con múltiples instancias requiere almacenamiento compartido.

## Revincular una app autenticadora existente

Si la cuenta tiene 2FA activo pero no aparece en la app móvil, entrar con un código de recuperación y abrir Seguridad. La opción Volver a vincular mi app exige contraseña y un segundo código de recuperación sin usar. Ese segundo código se consume de forma atómica antes de mostrar el QR vigente. No se cambia el secreto ni se desactiva la protección. Un formulario comprueba después el código TOTP generado en el teléfono y oculta el QR al terminar.

En TOTP Authenticator, usar el botón +, escanear el QR, guardar la cuenta y volver a la lista de cuentas. La cuenta se identifica por TRIBUTEK y el nombre de usuario. No es necesario abrir una cuenta nueva en TRIBUTEK ni esperar un QR durante cada ingreso.

El botón Volver al inicio de sesión descarta el intento de autenticación y carga de nuevo /login. Se comprobó en navegador que no envía de nuevo las credenciales ni vuelve al desafío por su cuenta.

Verificación adicional: 221 pruebas del backend correctas. Prueba en Chromium del regreso al login y del formulario de revinculación con servicios simulados. No se modificó el 2FA de las cuentas reales durante estas comprobaciones. El envío de códigos por correo no está configurado y requiere una integración separada con un remitente verificado.

## Edición de correo con validación

Solo Constanza puede editar el correo propio o el de otra cuenta administrativa desde Administradores. La contraseña solicitada es la de ConstanzaS, no la de la cuenta editada. Se comprueban permisos, contraseña, formato de correo con @ y punto en el dominio y unicidad en el servidor.

El primer paso envía un código de seis dígitos al nuevo correo. El correo anterior se conserva. La dirección puede corregirse en el mismo formulario, solicitando un código para la dirección corregida. Solo se actualiza la cuenta tras confirmar el código y volver a validar la contraseña. Los códigos vencen en cinco minutos, admiten cinco intentos y son de un solo uso. Los reenvíos requieren esperar un minuto, con diez envíos por responsable cada quince minutos.

El envío usa SMTP con TLS. Para Google Workspace ejecutar desde backend:

    python3 scripts/configurar-smtp.py

El script solicita una contraseña de aplicación sin mostrarla, comprueba la conexión de Google sin enviar mensajes y guarda la credencial solo en el archivo local .env. No usar la contraseña habitual ni pegar la credencial en el chat. Google necesita que la cuenta tenga disponible la opción de contraseñas de aplicación. Reiniciar el backend después de configurar SMTP.

No se muestra ningún mensaje de envío exitoso si falta la configuración o si el proveedor rechaza el mensaje. La dirección solo queda verificada por el código que recibe el destinatario. No se registran el correo nuevo, la contraseña ni el código en el detalle de auditoría. El guardado y el evento de auditoría se realizan en la misma transacción.

Los códigos pendientes y límites se conservan en memoria de una sola instancia. Reiniciar el backend invalida las solicitudes pendientes. Para varias instancias se necesita almacenamiento compartido.

## Dos métodos para completar el inicio de sesión

Después de comprobar usuario y contraseña, las cuentas con un segundo factor configurado reciben un desafío temporal. La pantalla muestra los botones App autenticadora y Código por correo. Cada botón está disponible únicamente si la cuenta tiene configurado ese método. El correo se ofrece cuando la cuenta tiene una dirección válida registrada. El envío necesita un servicio SMTP configurado y el ingreso siempre exige comprobar el código recibido.

No se exige un paso de verificación previo para que aparezca la opción de correo. El primer ingreso correcto con su código confirma la dirección y guarda email_verificado_en. También se puede verificar desde Seguridad o Administradores. No se marcan direcciones como verificadas sin comprobar un código.

Al elegir correo durante el ingreso, el servidor obtiene el destinatario de la cuenta del desafío, sin aceptar una dirección indicada por el navegador. El código se vincula al usuario y al intento concreto de ingreso, vence como máximo a los cinco minutos y se consume una sola vez. El desafío conserva su propio vencimiento de cinco minutos. Cambiar de método no genera una sesión ni permite omitir la verificación. La sesión anterior se limpia al iniciar un nuevo intento.

El correo se envía solo al pulsar la opción correspondiente y confirmar Acción solicitada. No se muestra el código en la respuesta, en consola ni en auditoría. Los mensajes se envían desde el SMTP ya configurado. Los límites de reenvío se aplican por cuenta incluso cuando se intenta iniciar sesión desde varios desafíos.

En Seguridad, el estado de la aplicación y la disponibilidad del correo se presentan por separado. Desactivar la app no borra la verificación del correo. Cambiar un correo fuera del flujo de confirmación invalida su marca de verificación. No se cambió la contraseña ni la configuración de la app de ninguna cuenta para añadir esta funcionalidad.

Migración aditiva: migrations/app/20261115T1500_correo_verificado/migration.sql. Se emitieron de nuevo contract.json y contract.d.ts a partir de contract.prisma. El esquema local se respaldó antes de agregar la columna.


## Disponibilidad automática según el correo de la cuenta

La pantalla de ingreso muestra Código por correo únicamente si la cuenta tiene una dirección válida registrada. Si no tiene correo, esa opción no se renderiza. La app aparece solo si está configurada. Las cuentas sin ninguno de esos métodos conservan el ingreso previo con contraseña.

El desafío queda vinculado a la dirección registrada al ingresar la contraseña. Si el correo cambia durante el intento, se rechaza el envío o la confirmación y se solicita comenzar nuevamente. El código correcto del primer ingreso confirma el acceso a la dirección, sin exigir que el usuario la haya verificado antes en otra pantalla.

Verificación: 252 pruebas automatizadas correctas, compilación de backend, comprobación de tipos y revisión de estilo de los componentes modificados del frontend.
