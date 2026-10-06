# Organización de componentes

Componenestes especificos y generales.

## ¿Para qué sirve un componente?

Un componente es una pieza reutilizable de la interfaz que encapsula su estructura, estilo y comportamiento. Su objetivo es facilitar la organización, reutilización y mantenimiento de la aplicación.

Por ejemplo, un botón de **"Guardar"** puede definirse como un componente y reutilizarse en diferentes partes del sistema sin tener que escribir nuevamente su estructura y estilos.

```tsx
function BotonGuardar() {
  return (
    <button onClick={() => alert("Guardado")}>
      Guardar
    </button>
  );
}
```

De esta forma, la interfaz puede dividirse en piezas pequeñas y reutilizables.

---

## Organización de los componentes

Los componentes del frontend se organizan según su responsabilidad dentro de la aplicación:

```text
components/
├── ui/
├── layout/
└── dashboard/
```

Esta organización permite separar los componentes genéricos de aquellos que cumplen funciones específicas dentro de la interfaz.

---

## `components/ui/`

Esta carpeta contiene componentes de interfaz **genéricos y reutilizables**.

Son elementos que pueden utilizarse en diferentes módulos de TRIBUTEK y no están relacionados con una funcionalidad específica del sistema.

Ejemplos:

```text
components/
└── ui/
    ├── Button.tsx
    ├── Input.tsx
    ├── Modal.tsx
    ├── Badge.tsx
    ├── Table.tsx
    └── Select.tsx
```

Por ejemplo, un botón definido en `Button.tsx` puede utilizarse en las pantallas de clientes, documentos, pagos o cualquier otra sección que necesite un botón.

### Ejemplos de componentes

* `Button.tsx`: botones reutilizables.
* `Input.tsx`: campos de entrada.
* `Modal.tsx`: ventanas modales.
* `Badge.tsx`: etiquetas para representar estados.
* `Table.tsx`: estructura reutilizable para mostrar información.
* `Select.tsx`: campos de selección.

**Principio:** los componentes de esta carpeta no deben depender de una funcionalidad específica de TRIBUTEK.

---

## `components/layout/`

Esta carpeta contiene los componentes encargados de la **estructura y navegación general de la aplicación**.

Ejemplos:

```text
components/
└── layout/
    ├── Sidebar.tsx
    ├── Header.tsx
    ├── Footer.tsx
    └── Breadcrumbs.tsx
```

Estos componentes permiten mantener una estructura visual consistente entre las diferentes páginas.

Por ejemplo, el `Sidebar.tsx` puede contener las opciones de navegación del sistema:

```text
Dashboard
Clientes
Documentos
Pagos
F29
Tareas
Configuración
```

### Ejemplos de componentes

* `Sidebar.tsx`: barra lateral de navegación.
* `Header.tsx`: encabezado de la aplicación.
* `Footer.tsx`: pie de página, si corresponde.
* `Breadcrumbs.tsx`: navegación jerárquica dentro del sistema.

**Principio:** estos componentes se encargan principalmente de la estructura de la aplicación y no de implementar la lógica específica de un módulo.

---

## `components/dashboard/`

Esta carpeta contiene componentes específicos de la interfaz del **dashboard administrativo**.

Estos componentes permiten mostrar información resumida y relevante para la gestión de TRIBUTEK.

Ejemplos:

```text
components/
└── dashboard/
    ├── StatCard.tsx
    ├── ClientSummary.tsx
    ├── PendingTasks.tsx
    └── ActivityList.tsx
```

### Ejemplos de componentes

* `StatCard.tsx`: muestra indicadores o estadísticas.
* `ClientSummary.tsx`: presenta un resumen de información de clientes.
* `PendingTasks.tsx`: muestra tareas o gestiones pendientes.
* `ActivityList.tsx`: presenta actividades recientes.

Por ejemplo, una tarjeta de estadísticas podría mostrar:

```text
┌─────────────────────┐
│ Clientes            │
│ 60                  │
│                    │
│ Total registrados   │
└─────────────────────┘
```

**Principio:** estos componentes están relacionados con la presentación de información en el dashboard y no representan módulos completos del sistema.

---

## Componentes específicos de cada funcionalidad

Los componentes que están directamente relacionados con una funcionalidad del sistema se organizan dentro de `features/`.

Por ejemplo:

```text
features/
├── clientes/
│   └── components/
│       ├── ClientTable.tsx
│       ├── ClientForm.tsx
│       └── ClientFilters.tsx
│
├── documentos/
│   └── components/
│       └── DocumentTable.tsx
│
├── pagos/
│   └── components/
│       └── PaymentTable.tsx
│
└── f29/
    └── components/
        └── F29Form.tsx
```

La diferencia principal es que estos componentes tienen relación directa con una funcionalidad determinada.

Por ejemplo:

```text
components/ui/Button.tsx
```

es un botón genérico que puede utilizarse en todo el sistema.

En cambio:

```text
features/clientes/components/ClientForm.tsx
```

es un formulario específico para la gestión de clientes.

---

La estructura busca evitar la duplicación de código y mantener separados los componentes según su responsabilidad.

En términos generales:

```text
UI genérica
    ↓
components/ui/

Estructura de la aplicación
    ↓
components/layout/

Dashboard
    ↓
components/dashboard/

Funcionalidades del sistema
    ↓
features/*/components/
```

Esta organización permite que el frontend de TRIBUTEK sea más fácil de mantener, ampliar y comprender a medida que se incorporen nuevas funcionalidades.
