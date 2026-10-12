# Vista Obligaciones

`app/admin/obligaciones/page.tsx` renderiza `Workspace` con `view="obligaciones"`.

## Archivos

| Archivo | Qué es |
|---|---|
| `Workspace.tsx` | Pantalla principal (filtros, tablas, modales) |
| `ClientSheet.tsx` | Ficha del cliente + formulario de pago |
| `model.ts` | Reglas del ledger (saldos, validaciones) |
| `syncObligaciones.ts` | Sincronización con el backend |
| `syncHelpers.ts` | Helpers puros (payload + merges, con tests) |
| `PaymentFiles.tsx` | Comprobantes de pago |

## De dónde salen los datos

La vista lee primero el **localStorage** (`tributek:ficha-ensayo:v1`) y después sincroniza con el backend:

1. Al montar: baja clientes (`GET /clientes`) y trae meses + abonos (`GET /obligaciones/meses/:clienteId`), que se **agregan** a lo local (nunca borran).
2. Al guardar un mes: `PUT /obligaciones/mes/:clienteId`.
3. Al registrar un abono: `POST /obligaciones/abonos/:clienteId` (antes del guardado local, para quedarse con el id real).
4. Al eliminar/corregir un abono: `DELETE /obligaciones/abonos/:abonoId`.

## Por qué se siguen viendo datos del storage

Porque el backend solo **aporta lo que falta** (merge aditivo). Lo que ya estaba en tu navegador sigue mostrándose aunque no exista en la BD. Para partir de cero en ese navegador, borra la clave `tributek:ficha-ensayo:v1` desde DevTools → Application → Local Storage y recarga: la vista se vuelve a hidratar solo con lo del servidor.

## Tests

`frontend/tests/syncObligaciones.test.mjs` (5 casos: payload, comparación y merges).
