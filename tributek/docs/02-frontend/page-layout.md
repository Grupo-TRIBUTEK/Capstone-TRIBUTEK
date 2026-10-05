# `layout.tsx` y `page.tsx`

Dentro del App Router de Next.js existen archivos especiales para organizar las rutas y la interfaz de la aplicación.

Los principales son `page.tsx` y `layout.tsx`. Cada uno cumple una función diferente.

---

## `page.tsx`

El archivo `page.tsx` define el **contenido de una ruta específica**.

Por ejemplo:

```text
app/
└── cliente/
    └── page.tsx
```

corresponde a:

```text
/cliente
```

En TRIBUTEK, este archivo puede representar la página principal del portal del cliente.

```tsx
export default function ClientePage() {
  return (
    <main>
      <h1>Bienvenido a TRIBUTEK</h1>

      {/* Componentes de la página */}
    </main>
  );
}
```

El `page.tsx` puede utilizar componentes para construir su contenido. De esta forma, la página no necesita concentrar toda la interfaz en un solo archivo.

Por ejemplo:

```text
app/cliente/page.tsx
        │
        ├── ClientSummary
        ├── PendingDocuments
        └── RecentActivity
```

En resumen:

> `page.tsx` define el contenido que se muestra en una ruta.

---

## `layout.tsx`

El archivo `layout.tsx` define el **esqueleto o estructura compartida** de una sección de la aplicación.

Por ejemplo:

```text
app/
└── admin/
    ├── layout.tsx
    ├── page.tsx
    ├── clientes/
    │   └── page.tsx
    ├── documentos/
    │   └── page.tsx
    └── pagos/
        └── page.tsx
```

En TRIBUTEK, `admin/layout.tsx` puede utilizarse para mantener elementos comunes del área administrativa, como:

* `Header`
* `Sidebar`
* Navegación
* Estructura principal del contenido

Un ejemplo simplificado:

```tsx
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Header />

      <div>
        <Sidebar />

        <main>
          {children}
        </main>
      </div>
    </div>
  );
}
```

`children` representa el contenido de la página que se está mostrando.

Por ejemplo:

```text
/admin
```

utiliza:

```text
admin/layout.tsx
       +
admin/page.tsx
```

Mientras que:

```text
/admin/clientes
```

utiliza:

```text
admin/layout.tsx
       +
admin/clientes/page.tsx
```

De esta manera, el mismo esqueleto puede utilizarse en diferentes páginas sin tener que repetirlo.

---

## Relación entre `layout.tsx` y `page.tsx`

Una forma sencilla de entenderlo es:

```text
layout.tsx
    ↓
Esqueleto de la sección
    │
    └── {children}
           ↓
        page.tsx
           ↓
      Componentes
```

Por ejemplo:

```text
admin/layout.tsx
       │
       ├── Header
       ├── Sidebar
       │
       └── {children}
              │
              └── admin/clientes/page.tsx
                         │
                         ├── ClientTable
                         ├── SearchInput
                         └── Button
```

El `layout.tsx` proporciona la estructura que se mantiene, mientras que el `page.tsx` proporciona el contenido de la ruta actual.

---

## Diferencia principal

| Archivo      | Función                                                                    |
| ------------ | -------------------------------------------------------------------------- |
| `page.tsx`   | Define el contenido de una ruta específica.                                |
| `layout.tsx` | Define una estructura compartida entre una ruta y sus rutas descendientes. |

En términos simples:

```text
layout.tsx → esqueleto / estructura
page.tsx   → contenido de la ruta
```

---

## Ejemplo aplicado a TRIBUTEK

Una posible organización inicial es:

```text
app/
├── login/
│   └── page.tsx
│
├── admin/
│   ├── layout.tsx
│   ├── page.tsx
│   │
│   ├── clientes/
│   │   └── page.tsx
│   │
│   ├── documentos/
│   │   └── page.tsx
│   │
│   ├── pagos/
│   │   └── page.tsx
│   │
│   └── f29/
│       └── page.tsx
│
└── cliente/
    ├── layout.tsx
    └── page.tsx
```

En esta estructura:

* `login/page.tsx` → página de inicio de sesión.
* `admin/layout.tsx` → estructura común del área administrativa.
* `admin/page.tsx` → dashboard administrativo.
* `admin/clientes/page.tsx` → gestión de clientes.
* `admin/documentos/page.tsx` → gestión de documentos.
* `admin/pagos/page.tsx` → gestión de pagos.
* `admin/f29/page.tsx` → sección relacionada con F29.
* `cliente/layout.tsx` → estructura común del portal del cliente, si es necesaria.
* `cliente/page.tsx` → página principal del portal del cliente.

No es necesario crear una carpeta llamada `layout`. En el App Router, `layout.tsx` es un **archivo especial de Next.js**.

---

## Resumen

`layout.tsx` y `page.tsx` permiten separar la estructura de una sección de su contenido.

**`layout.tsx`** define el esqueleto compartido y utiliza `children` para mostrar las páginas correspondientes.

**`page.tsx`** define el contenido de una ruta específica y puede utilizar componentes para construir la interfaz.

Esta separación permite evitar código repetido y mantener organizada la estructura del frontend de TRIBUTEK.
