# Comprobantes de pagos

El módulo complementa el historial local de pagos. No cambia saldos ni registra pagos por cuenta del cliente.

- La administradora registra el movimiento y habilita su carpeta en el servidor. Para movimientos antiguos, abrir Comprobantes desde el historial habilita la carpeta.
- El portal muestra las carpetas de las empresas vinculadas al usuario mediante UsuarioCliente. Cada consulta, descarga y carga verifica ese vínculo en el backend.
- Hasta 10 PDF, PNG o JPG por envío, máximo 8 MB sumados y 40 archivos por pago. El tipo se verifica con la firma del archivo.
- Cada lote de respaldos conserva método, monto informativo y cuentas de origen y receptora. Para distintos métodos o cuentas se suben lotes separados. Los importes de los archivos no se suman al registro contable.
- Corregir un pago conserva transferId. Eliminarlo archiva su carpeta, sin borrar físicamente los respaldos. Quitar un comprobante requiere ser administradora o quien lo cargó.

## Almacenamiento

Los archivos y su índice se guardan en backend/uploads/payment-evidence, fuera de Git. PAYMENT_EVIDENCE_ROOT permite configurar una ubicación persistente. Respaldar la carpeta completa. No queda incluida en el JSON de respaldo local del frontend.

Esta implementación usa un único proceso de backend y un volumen persistente. Para varias instancias, sustituir los índices JSON y la cola en memoria por almacenamiento compartido con transacciones. No usar un disco efímero en producción.

Los pagos siguen guardándose en el navegador. El índice del servidor comparte únicamente su referencia, fecha, monto y respaldos. No es una migración del historial contable al backend. Si falla la habilitación después de guardar un pago, la interfaz avisa y permite reintentar desde Comprobantes. Restaurar un respaldo local no sincroniza automáticamente el índice remoto.

Reiniciar frontend y backend después de incorporar el módulo y el rewrite. No requiere cambios de esquema SQL.

## Comprobación

Backend: node node_modules/vitest/vitest.mjs run src/payment-evidence/payment-evidence.spec.ts
Frontend: node --test tests/management.test.mjs tests/ficha.test.mjs tests/f29.test.mjs

Prueba manual: registrar un pago mixto, abrir su carpeta, subir comprobantes de transferencia con ambas cuentas, agregar un comprobante de efectivo, entrar con el cliente vinculado y descargar/agregar un archivo. Corregir el importe y comprobar que la carpeta conserva los archivos. Un usuario no vinculado debe recibir 403.
