# Panel Cliente - En evaluacion

Documentación inicial del **Portal Cliente de TRIBUTEK**. Este documento tiene como objetivo registrar las decisiones, alcance y dependencias iniciales para orientar la implementación del panel cliente y su integración con el panel administrativo.

> **Estado:** Inicial / En desarrollo

---

## 1. Propósito

El Panel Cliente permitirá que los clientes de TRIBUTEK puedan consultar y entregar información y documentación relacionada con sus servicios.

El acceso estará restringido a la información autorizada para cada cliente. El portal no tendrá registro público y la habilitación de acceso será realizada desde el panel administrativo.

La finalidad principal es facilitar la entrega de antecedentes desde el portal y reducir consultas que se generan cuando el cliente no tiene acceso a documentos que TRIBUTEK ya tiene disponibles.

---

## 2. Alcance inicial

El portal contempla inicialmente dos funciones principales:

### Consultar documentos

El cliente podrá consultar los documentos que TRIBUTEK haya habilitado para su cuenta.

Se contempla:

* Búsqueda de documentos.
* Filtros por estado, tipo y período.
* Visualización del documento.
* Descarga desde la vista del documento.
* Consulta del estado del documento.
* Restricción de acceso según el cliente autenticado.

### Entregar documentos

El cliente podrá entregar antecedentes solicitados por TRIBUTEK mediante el portal.

Se contempla:

* Selección de archivos.
* Carga de documentos.
* Asociación del documento al cliente correspondiente.
* Asociación del documento al período o contexto correspondiente.
* Consulta del estado de la entrega.

Las categorías definitivas de documentos deberán validarse con TRIBUTEK antes de establecerlas como reglas definitivas del sistema.

---

## 3. Regla principal de acceso

Cada cliente solamente podrá acceder a la información habilitada para su propia cuenta.

Un cliente podrá estar registrado en TRIBUTEK sin necesariamente tener acceso al portal.

La habilitación del portal será realizada administrativamente.

No existirá registro público de clientes.

### Relación cliente / usuario

Se mantendrá separada la entidad **Cliente** de la entidad **Usuario**.

Esto permite que:

* Un cliente exista sin usuario de portal.
* Un cliente tenga un usuario habilitado posteriormente.
* El acceso sea controlado mediante autenticación.
* Los permisos se determinen según el usuario autenticado.

Los trabajadores registrados en el módulo de Recursos Humanos serán registros asociados a empresas clientes y no constituirán un tercer tipo de usuario del sistema.

---

## 4. Objetivo del portal

El portal busca facilitar la comunicación documental entre TRIBUTEK y sus clientes, permitiendo que los antecedentes puedan ser entregados y consultados desde un mismo lugar.

Se espera principalmente:

* Facilitar la entrega de antecedentes.
* Permitir al cliente consultar documentos disponibles.
* Reducir consultas ocasionadas por falta de acceso a documentos.
* Mantener los documentos relacionados con el cliente y su contexto.
* Mejorar la trazabilidad de la información entregada y consultada.

Estos beneficios corresponden a resultados esperados y deberán validarse durante las pruebas con TRIBUTEK.

---

## 5. Primera dependencia de implementación

***La implementación inicial del Panel Cliente dependerá de la gestión documental existente en el Panel Administrador. Actualmente, Formalizaciones ya permite almacenar archivos asociados a un cliente y período. Esta funcionalidad servirá como primer caso para validar el flujo de documentos entre el administrador, la base de datos y el portal cliente. Las demás áreas podrán incorporarse posteriormente si TRIBUTEK determina que sus archivos o resultados deben formar parte del portal***

El cliente podrá consultar documentos únicamente si estos existen y están correctamente relacionados en la base de datos.

Por esta razón, la **gestión documental del panel administrativo constituye el primer ladrillo de la implementación del Panel Cliente**.

### Flujo inicial

```text
Panel Administrador
        │
Carga del documento
        │
Asociación al Cliente
        │
Definición de visibilidad
        │
Base de datos
        │
Usuario Cliente autenticado
        │
Panel Cliente
        │
Consultar documento
```

---

## 6. Requisitos iniciales de datos

Para que un documento pueda mostrarse correctamente en el Panel Cliente, debe existir una relación que permita determinar como mínimo:

* Qué cliente posee el documento.
* Qué archivo corresponde al documento.
* Qué tipo de documento es.
* Qué período corresponde, cuando aplique.
* Qué estado tiene.
* Si el documento es visible para el cliente.
* Fecha de creación o carga.

La estructura definitiva dependerá del modelo de datos y de las reglas que se validen con TRIBUTEK.

---

## 7. Seguridad y aislamiento

El portal debe garantizar que un cliente no pueda acceder a documentos pertenecientes a otro cliente.

La autorización no debe depender únicamente de que el documento aparezca o no en la interfaz.

El backend deberá validar que:

```text
Usuario autenticado
        |
Cliente asociado
        |
Documento solicitado
        |
¿El documento pertenece al cliente?
        |
Sí → Permitir acceso
No → Denegar acceso
```

Además, el cliente no tendrá acceso a:

* Notas internas de TRIBUTEK.
* Información de otros clientes.
* Documentos no habilitados para su cuenta.
* Información administrativa que no corresponda al portal.

---

<!-- ## 8. Estructura inicial del Panel Cliente -->

<!-- La estructura podrá evolucionar durante el desarrollo, pero inicialmente se contempla:

```text
Panel Cliente
│
├── Inicio
│   └── Resumen
│
├── Documentos
│   ├── Consultar documentos
│   └── Subir documentos
│
├── Solicitudes
│
└── Mi cuenta
```

El desarrollo inicial se concentrará en **Documentos**, debido a que constituye la principal dependencia para validar el funcionamiento del portal. -->

---

## 9. Pendientes

* [ ] Definir modelo definitivo de documentos.
* [ ] Implementar gestión documental en Panel Administrador.
* [ ] Asociar documentos con clientes.
* [ ] Definir regla de visibilidad por cliente.
* [ ] Implementar carga de documentos.
* [ ] Implementar consulta de documentos.
* [ ] Implementar visualización.
* [ ] Implementar descarga.
* [ ] Implementar filtros.
* [ ] Implementar control de acceso.
* [ ] Validar categorías documentales con TRIBUTEK.
* [ ] Validar flujo completo Administrador → Cliente.
* [ ] Realizar pruebas de aislamiento entre clientes.

---

## 10. Criterio inicial de implementación

El desarrollo seguirá el siguiente orden:

```text
1. Base de datos
      |
2. Gestión documental Administrador
      |
3. Asociación documento ↔ cliente
      |
4. Control de visibilidad
      |
5. API para documentos del cliente
      |
6. Panel Cliente
      |
7. Consulta y visualización
      |
8. Carga de documentos por cliente
      |
9. Pruebas y validación
```

## 11. Estado actual del proyecto 

Estado actual
- El modelo Documento ya contempla cliente, período, tipo, estado, archivo y visibleCliente (contract.prisma).

- El backend ya permite cargar y listar documentos. El almacenamiento actual es local y limita las cargas a 10 MB (documentos.service.ts).

- Formalizaciones ya tiene un flujo de carga y consulta de respaldos ligado a un cliente y período (Formalization.tsx).

- La pantalla del cliente para subir documentos aún es solo informativa (subir/page.tsx).
Antes de habilitar la carga cliente, falta definir permisos: el backend asigna visibleCliente: false al cargar y hay que garantizar que cada usuario solo acceda a documentos de sus clientes.
