# Obligaciones

Componente de gestión del módulo Obligaciones dentro de `Workspace`.

## Comportamiento actual

- La vista Obligaciones siempre toma datos del backend como fuente de verdad.
- `Workspace.tsx` construye `vista` (un `Ledger` filtrado) con los clientes y los
  meses/abonos que trajo el backend en `hidratarObligaciones`.
- Los cálculos de mesa (`debt`, `balance`, `totals`, resumen por cliente,
  preparación de servicios mensuales, etc.) usan `vista` y nunca `data`, para que
  la pantalla no muestre datos locales no sincronizados.
- `data` se mantiene solo para persistencia local (`persist`) y para descargar un
  respaldo JSON manual.

## Ejecutar tests

La prueba de integración de sincronización reside en
`tests/syncObligaciones.test.mjs` y se puede correr con Node:

```bash
node tests/syncObligaciones.test.mjs
```
