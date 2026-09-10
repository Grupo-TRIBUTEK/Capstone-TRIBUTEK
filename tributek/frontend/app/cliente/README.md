# `layout.tsx` y `page.tsx`

Dentro del App Router de Next.js existen archivos especiales que permiten definir la estructura y el contenido de las diferentes rutas de la aplicación.

Los dos archivos principales para construir una página son `layout.tsx` y `page.tsx`. Aunque ambos participan en la construcción de la interfaz, tienen responsabilidades diferentes.

---

## `page.tsx`

El archivo `page.tsx` representa **el contenido principal de una ruta específica**.

Por ejemplo:

```text
app/
└── cliente/
    └── page.tsx
```

corresponde a la ruta:

```text
/cliente
```

En TRIBUTEK, este archivo puede utilizarse para construir la página inicial del portal del cliente.

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

El `page.tsx` puede utilizar componentes para construir la interfaz sin tener que concentrar toda la lógica y estructura en un único archivo.

Por ejemplo:

```text
app/cliente/page.tsx
        │
        ├── ClientSummary
        ├── PendingDocuments
        └── RecentActivity
```

De esta forma, `page.tsx` actúa principalmente como el punto donde se **compone el contenido correspondiente a una ruta**.

---

## `layout.tsx`

El archivo `layout.tsx` se utiliza para definir una **estructura compartida entre diferentes páginas**.

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

El `layout.tsx` puede contener elementos que deben mantenerse presentes mientras el usuario navega entre las diferentes páginas administrativas.

En TRIBUTEK podría contener:

* Barra lateral (`Sidebar`).
* Encabezado (`Header`).
* Navegación.
* Estructura principal del área administrativa.

Un ejemplo simplificado sería:

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

La propiedad `children` representa el contenido de la página que se está mostrando.

Por ejemplo, al acceder a:

```text
/admin
```

se utilizará:

```text
admin/layout.tsx
+
admin/page.tsx
```

Mientras que al acceder a:

```text
/admin/clientes
```

se utilizará:

```text
admin/layout.tsx
+
admin/clientes/page.tsx
```

Esto permite mantener la estructura administrativa sin tener que repetirla en cada página.

---

## ¿Por qué utilizar ambos?

La principal razón es **evitar la duplicación de código y separar responsabilidades**.

Sin un `layout.tsx`, cada página podría tener que repetir elementos como:

```tsx
<Header />
<Sidebar />
```

Por ejemplo:

```text
admin/page.tsx
admin/clientes/page.tsx
admin/documentos/page.tsx
admin/pagos/page.tsx
```

Cada una tendría que implementar nuevamente la misma estructura.

Con un `layout.tsx`, esta estructura se define una sola vez:

```text
admin/layout.tsx
       │
       ├── Header
       ├── Sidebar
       │
       └── {children}
              │
              ├── admin/page.tsx
              ├── clientes/page.tsx
              ├── documentos/page.tsx
              └── pagos/page.tsx
```

De esta manera, las páginas solamente se encargan de proporcionar su contenido específico.

---

## Diferencia principal

| Archivo      | Función                                            |
| ------------ | -------------------------------------------------- |
| `page.tsx`   | Define el contenido de una ruta específica.        |
| `layout.tsx` | Define una estructura compartida por varias rutas. |

En términos simples:

```text
layout.tsx
    ↓
Estructura que se mantiene

page.tsx
    ↓
Contenido que cambia según la ruta
```

---

## Ejemplo aplicado a TRIBUTEK

Una posible organización sería:

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

* `login/page.tsx` representa la página de inicio de sesión.
* `admin/layout.tsx` contiene la estructura común del área administrativa.
* `admin/page.tsx` representa el dashboard administrativo.
* `admin/clientes/page.tsx` representa la página de gestión de clientes.
* `admin/documentos/page.tsx` representa la página de documentos.
* `admin/pagos/page.tsx` representa la página de pagos.
* `admin/f29/page.tsx` representa la página relacionada con F29.
* `cliente/layout.tsx` puede contener la estructura común del portal del cliente.
* `cliente/page.tsx` representa la página principal del portal del cliente.

## Resumen

`layout.tsx` y `page.tsx` cumplen funciones diferentes dentro de la aplicación.

**`layout.tsx`** permite definir elementos y estructuras que se comparten entre diferentes páginas, evitando repetir código.

**`page.tsx`** define el contenido específico de una ruta y puede utilizar componentes para construir su interfaz.

La separación de estas responsabilidades permite mantener una estructura más organizada y facilita el mantenimiento y crecimiento del frontend de TRIBUTEK.
