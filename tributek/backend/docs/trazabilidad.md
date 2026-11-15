# Consulta y conservación de trazabilidad

La vista abre los últimos 30 días calendario de Chile continental, incluido el día actual. Consulta 25 registros por página y muestra el total que coincide con los filtros. El detalle de un registro se abre desde su fila.

Se puede consultar todo el historial o indicar fechas en Más filtros. Limpiar vuelve al período reciente. El filtro por fechas no borra ni archiva eventos antiguos.

La API conserva un máximo de 100 filas por petición. Las fechas explícitas permiten recuperar períodos anteriores. El orden usa fecha e ID para evitar ambigüedad entre eventos con la misma hora.

El interceptor registra operaciones de escritura completadas y accesos verificados. No registra las consultas GET ni cada mensaje del asistente. Los detalles excluyen cuerpos de solicitudes, archivos, contraseñas y códigos.

## Índices de consulta

El contrato incluye índices por fecha e ID, área y fecha, y acción y fecha. Para aplicar esta mejora de forma aditiva desde tributek/backend:

```bash
node migrations/app/20261115T2300_auditoria_consultas/migration.mjs
```

El script utiliza la conexión del entorno local y crea índices de forma concurrente. No elimina datos y permite volver a ejecutarlo. Estos índices facilitan filtros y ordenación, pero las búsquedas de texto libre y el conteo de todo el historial pueden seguir requiriendo recorrer muchas filas.

## Crecimiento futuro

No hay eliminación automática ni un plazo de retención inventado. Antes de archivar, el equipo debe definir el plazo con la responsable de TRIBUTEK, conservar un respaldo verificable y probar la recuperación de un período. Un CSV de consulta no sustituye un respaldo de base de datos.

Medir periódicamente la cantidad de eventos y el tamaño de tabla e índices. Evaluar particiones por fecha cuando el crecimiento observado justifique su complejidad.
