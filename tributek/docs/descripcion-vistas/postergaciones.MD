# Vista de Postergaciones

## 1. Propósito y objetivo

La vista **Postergaciones** permite a la administradora gestionar las obligaciones cuyo vencimiento ha sido aplazado según las reglas acordadas con el cliente.

Su propósito es mantener el control de los montos postergados, sus saldos pendientes y sus nuevas fechas de vencimiento, evitando que una misma deuda se contabilice dos veces.

**Objetivos principales:**
- Consultar las postergaciones registradas y sus respectivos conceptos.
- Visualizar el monto pendiente y la nueva fecha de vencimiento.
- Mantener el seguimiento de los abonos realizados.
- Permitir la edición de los datos autorizados sin perder los abonos registrados.
- Mantener la información coherente con la vista Obligaciones.

## 2. Flujo funcional

1. La administradora ingresa a la vista **Postergaciones**.
2. Selecciona una postergación existente o registra una nueva, según corresponda.
3. Consulta el concepto, el monto pendiente y la fecha de vencimiento acordada.
4. Si el cliente realiza un abono, este se registra mediante el flujo de pagos correspondiente.
5. La administradora vuelve a consultar la postergación para verificar que el saldo pendiente se haya actualizado.
6. Si necesita corregir información, modifica un dato permitido y guarda los cambios.
7. Finalmente, comprueba que el abono se conserve, que el saldo sea correcto y que la deuda no se duplique.

## 3. Prueba funcional: PF-054 — Abonar y corregir una postergación

**Objetivo de la prueba:** comprobar que una postergación admite un abono parcial y la edición de un dato permitido sin perder la información del pago ni alterar incorrectamente el saldo.

### Datos de prueba

- Monto inicial de la postergación: $20.000.
- Abono registrado: $5.000.
- Saldo pendiente esperado: $15.000.

### Procedimiento

1. Ingresar a Postergaciones y seleccionar una postergación de $20.000.
2. Acceder a Obligaciones y registrar un abono de $5.000 asociado a la deuda correspondiente.
3. Volver a Postergaciones y consultar el saldo pendiente.
4. Editar un dato permitido de la postergación y guardar los cambios.
5. Consultar nuevamente la postergación y comprobar el saldo, el abono y los datos modificados.

### Resultado esperado

La postergación muestra un saldo pendiente de $15.000. El abono de $5.000 permanece registrado después de editar el dato permitido y la información se mantiene coherente entre Postergaciones y Obligaciones, sin duplicar el pago ni la deuda.

**Criterio de aprobación:** la prueba se considera aprobada cuando el saldo pendiente, el abono y los datos editados se conservan correctamente después de guardar y volver a consultar la información.