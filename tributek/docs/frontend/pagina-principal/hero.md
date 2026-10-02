# Integración de Embla Carousel en el Hero

Desde la documentación de **Embla Carousel** se pueden revisar las diferentes opciones disponibles para implementar el carrusel dinámico en el Hero.

https://www.embla-carousel.com/docs/examples/predefined/

A partir de los ejemplos disponibles, se seleccionan las opciones que se utilizarán en el Hero de TRIBUTEK.

Por ejemplo, si queremos agregar **Autoplay**, se instala el plugin correspondiente:

```bash
npm install embla-carousel-autoplay
```

Los plugins se van agregando según las funcionalidades que se quieran utilizar.

---

## 1. Crear `HeroShowcase.tsx`

Se crea un nuevo componente llamado:

```text
HeroShowcase.tsx
```

Este componente se encargará de contener la parte dinámica del Hero, mientras que el contenido principal del Hero se mantiene estático.

---

## 2. Revisar la instalación de los plugins

Referencia oficial de instalación de plugins:

https://www.embla-carousel.com/docs/api/plugins#installation

Los complementos oficiales de Embla se publican como paquetes NPM independientes.

Por ejemplo, para instalar el plugin **Autoplay**:

```bash
npm install embla-carousel-autoplay --save
```

---

## 3. Instalar las tres librerías

Para la implementación del Hero dinámico de TRIBUTEK se instalarán tres paquetes, cada uno con una función diferente:

```bash
npm install embla-carousel-react embla-carousel-autoplay embla-carousel-fade
```

| Paquete                   | ¿Qué hace?                                                                          | En TRIBUTEK                            |
| ------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------- |
| `embla-carousel-react`    | Integra **Embla Carousel con React** mediante hooks.                                | Es la **base del carrusel**.           |
| `embla-carousel-autoplay` | Hace que los slides **cambien automáticamente** después de un tiempo.               | Dashboard → Documentos → Obligaciones. |
| `embla-carousel-fade`     | Hace que los slides **aparezcan y desaparezcan suavemente** en lugar de deslizarse. | Transición visual suave.               |

---

## 4. Verificar la integración

Una vez creadas las dependencias y el componente `HeroShowcase.tsx`, se debe verificar que la integración se visualice correctamente antes de realizar un `pull` o continuar con otros cambios.

En esta etapa se debe comprobar principalmente que:

* `HeroShowcase.tsx` se muestre correctamente.
* El carrusel funcione dentro del Hero.
* Los slides se visualicen correctamente.
* No existan errores de compilación.
* La integración no afecte el diseño actual del Hero.

> **Nota:** Este paso debe verificarse antes de continuar con la configuración de las funcionalidades adicionales.

---

De esta manera, el contenido de la izquierda del Hero permanece estático y solamente cambia la sección visual ubicada en el lado derecho.
