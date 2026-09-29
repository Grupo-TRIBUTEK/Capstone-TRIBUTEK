# Guía visual de TRIBUTEK

Esta guía resume la dirección visual que se observa en el frontend y sus mockups. Sirve como punto de partida compartido; la paleta todavía no está aprobada como manual de marca definitivo.

## Dirección visual

TRIBUTEK debe sentirse como una herramienta contable clara, confiable y ordenada. El azul marino estructura la navegación y las acciones; el terracota aporta acentos; las superficies claras dejan que los datos sean el centro.

## Paleta actual

Los siguientes valores se conservan en `app/globals.css` y reflejan decisiones ya presentes en el proyecto.

| Token o uso | Valor | Aplicación |
| --- | --- | --- |
| `primary` | `#203457` | Acción principal y navbar |
| `primary-hover` | `#1F2842` | Hover de la acción principal |
| `primary-strong` | `#252F46` | Navegación administrativa y títulos existentes |
| `primary-strong-hover` | `#344463` | Hover usado por botones existentes |
| `secondary` | `#B98B7B` | Acento y selección |
| `secondary-strong` | `#735044` | Texto de acento sobre fondos claros |
| `secondary-surface` | `#FAF5F3` | Fondo suave para avisos |
| `secondary-soft` | `#EFE0DA` | Acento suave |
| Fondo claro | `#FAF9F6` | Fondo general |
| Superficie | `#FFFFFF` | Tarjetas y formularios |
| Texto | `#171717` | Texto principal actual |
| Texto secundario | `#64748B` | Ayuda y metadatos |
| Borde | `#E2E8F0` | Separadores y contenedores |

Hay dos tonos de azul marino porque el proyecto ya los usaba en lugares distintos. Los tokens los hacen explícitos sin cambiar sus valores; consolidarlos es una decisión de diseño pendiente.

## Tema oscuro

La clase `.dark` se aplica al elemento `<html>`. Solo cambian el fondo, las superficies, el texto principal y el borde:

| Token | Claro | Oscuro |
| --- | --- | --- |
| `background` | `#FAF9F6` | `#111827` |
| `surface` | `#FFFFFF` | `#1F2937` |
| `surface-muted` | `#F1F5F9` | `#374151` |
| `text` | `#171717` | `#F1F5F9` |
| `border` | `#E2E8F0` | `#374151` |

El navbar guarda la elección del usuario; si no existe una preferencia guardada, toma la preferencia del sistema. Al crear componentes que admitan el modo oscuro, usa tokens de fondo, superficie, texto y borde, en vez de fijar `bg-white` o `text-black`.

## Tipografía

- `--font-body` y `--font-heading` conservan Arial, Helvetica y sans-serif, que corresponden al estilo aplicado actualmente.
- `--font-mono` usa Geist Mono, disponible para códigos o cifras tabulares.
- Geist Sans también está cargada en `app/layout.tsx`, pero no es la fuente aplicada a `body`. Cambiar la fuente de interfaz debe tratarse como una decisión visual explícita.
- Usa las utilidades tipográficas de Tailwind para jerarquía, peso, tamaño e interlineado; no hacen falta clases CSS por título.

## Bordes y superficies

- Radios disponibles: `rounded-control` para controles, `rounded-card` para tarjetas y `rounded-dialog` para diálogos.
- Usa bordes finos y neutrales para dividir contenido; reserva sombras de Tailwind para elementos elevados como menús o diálogos.
- Evita mezclar radios muy distintos en componentes del mismo nivel. En pantallas existentes aparecen desde `rounded-lg` hasta `rounded-[2rem]`.

## Componentes y estados

- Acción primaria: azul marino y texto blanco.
- Acción secundaria: superficie, borde neutral y texto principal.
- Estado seleccionado: puede usar terracota, acompañado por texto o icono para no depender solo del color.
- Estados semánticos disponibles: `success`, `warning` y `error`, cada uno con color, superficie y borde.
- Conserva indicadores `focus-visible` y nombres accesibles para controles interactivos.
- Reutiliza `app/components/ui/Icon.tsx` y mantiene coherentes tamaño y trazo.

## Responsive

Diseña primero para móvil y amplía con los breakpoints de Tailwind (`sm`, `md`, `lg`). En tablas anchas, permite desplazamiento horizontal si reducir columnas dañaría la lectura. Mantén controles fáciles de tocar y evita posiciones fijas que se desplacen en pantallas estrechas.

## Uso de tokens en Tailwind

Los tokens semánticos se mapean desde `@theme inline` en `app/globals.css`:

```tsx
<main className="bg-background text-text">
  <section className="rounded-card border border-border bg-surface p-5">
    <p className="text-text-muted">Resumen del período</p>
    <button className="rounded-control bg-primary px-4 py-2 text-white hover:bg-primary-hover">
      Guardar
    </button>
  </section>
</main>
```

Estados semánticos usan `text-success`, `bg-success-surface` y `border-success-border` (con equivalentes `warning` y `error`). El espaciado continúa usando la escala nativa de Tailwind, por ejemplo `p-4`, `px-6` y `gap-4`.

## Archivos de referencia

- `app/globals.css`: tokens, temas e integración con Tailwind.
- `app/layout.tsx`: fuentes Next.js y estructura raíz.
- `app/components/ui/`: controles reutilizables.
- `app/components/layout/`: navegación y estructura de página.
- `Fase 1/Evidencias grupales/Mockups/`: referencia visual inicial.

## Pendiente de decisión

- Aprobar la paleta y decidir si los dos azules principales se consolidan.
- Decidir si Geist Sans reemplazará Arial en la interfaz.
- Definir colores específicos para gráficos y estados del negocio.
- Revisar contraste de todos los pares de texto y superficie en ambos temas.
