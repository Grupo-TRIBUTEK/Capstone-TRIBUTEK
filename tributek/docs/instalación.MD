# Instalación de las herramientas del proyecto 

## Etapa 1: Creación de la estructura del proyecto

## 1. Instalación de Next.js

### Referencia de la instalacion

[Tutorial Next.js 14 paso a paso, para Principiantes](https://www.youtube.com/watch?v=jMy4pVZMyLM)


Desde [nextjs.org](https://nextjs.org/) se observa como referencia el comando utilizado para crear una aplicación Next.js desde cero:

```bash
npx create-next-app@latest
```

Sin embargo, como justificacion, se mantendra una arquitectura del proyecto separado entre **frontend** y **backend**. Por esta razon, la aplicación Next.js se creará dentro de la carpeta correspondiente al frontend:

```bash
npx create-next-app@latest frontend 
```

De esta manera, en la primera etapa de la creacion del proyecto el frontend y backend permanaceran organizados en directorios independientes. 

---

## 2. Instalación de NestJS

Para el backend no se utilizara `create-next-app@latest`, sino **NestJS**, ya que será el **framework** encargado de implementar la lógica de negocio y la API del sistema.

### 2.1 Instalación del CLI de NestJS

Se instala el CLI de NestJS de manera global

```bash
npm i -g @nestjs/cli
```

### 2.2 Creación del proyecto NestJS

Luego, se crea el proyecto backend

```bash
nest new backend
```
### 2.3 Configuración inicial de NestJS

NestJS solicita algunas configuraciones iniciales. Para este proyecto se seleccionaron las siguientes opciones:

| Pregunta                                                                        | Opción seleccionada         |
| ------------------------------------------------------------------------------- | --------------------------- |
| **Which package manager would you like to use?**                                | `npm`                       |
| **Would you like to enable auto-instrumented observability (@nestjs/observe)?** | `N` (No)                    |
| **Which module system would you like to use?**                                  | `ESM (ES Modules)`          |

La selección de ESM (ES Modules) corresponde a la configuración moderna del sistema de módulos de JavaScript y se encuentra asociada al uso de Vitest para las pruebas.

No se habilitó la observabilidad automática, ya que esta funcionalidad no es necesaria para la configuración inicial del proyecto.



## 3. Arquitectura inicial del proyecto

```
tributek/
├── frontend/  <-- Next.js + React + TypeScript + Tailwind → :3000
│
├── backend/   <-- NestJS + TypeScript → :3001
│
└── README.md
```

Esta separación permite mantener independientes las responsabilidades del frontend y backend, facilitando posteriormente el **desarrollo**, **mantenimiento** y **escalabilidad** del sistema.

(Se elimina un .git generado en el backend)

```bash
Remove-Item .\backend\.git -Recurse 
```
## Conclusiones iniciales 

En esta etapa se configuro la estructura base del proyecto TRIBUTEK, separando el frontend y el backend en directorios independientes.

Para el frontend se utilizara **Next.js**, mientras que para el backend se utilizara **NestJS** como framework encargado de implementar la logica de negocio y la API. 

La configuración inicial de NestJS se realizo utilizando **npm** como [gestor de paquetes](https://www.google.com/search?q=que+es+un+gestor+de+paquetes+por+ejemplo+npm&oq=que+es+un+gestor+de+paquetes+por+ejemplo+npm&gs_lcrp=EgZjaHJvbWUyBggAEEUYOdIBCDc2OTdqMGo3qAIAsAIA&sourceid=chrome&source=chrome.ob&ie=UTF-8), ESM (ES modules) como sistema de modulos y con la opción de sin habilitar la observabildiad automatica.

Esta estructura permitirá incorporar posteriormente las demás tecnologías y dependencias necesarias para el desarrollo del sistema, como Prisma, PostgreSQL, autenticación mediante JWT, Argon2, generación de documentos, almacenamiento de archivos y otras herramientas requeridas por el proyecto.

---

## Ejecución del proyecto para desarrollo (Archivo Concurrently)

Para ejecutar simultáneamente el frontend y el backend durante el desarrollo, se utiliza la herramienta **Concurrently**, la cual permite ejecutar múltiples comandos de forma paralela desde una misma terminal.

Primero, se instala como dependencia de desarrollo mediante el siguiente comando:

```bash
npm install -D concurrently
```

La estructura general del proyecto queda organizada de la siguiente manera:

```text
TRIBUTEK/
├── frontend/
├── backend/
└── package.json
```

En el archivo `package.json` de la raíz se define el siguiente script:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev --prefix frontend\" \"npm run start:dev --prefix backend\""
  }
}
```

De esta manera, ambos proyectos pueden iniciarse simultáneamente mediante un único comando:

```bash
npm run dev
```

El frontend y backend se ejecutarán de forma independiente, cada uno utilizando su respectivo servidor de desarrollo.


--- 

NestJS (Listo) -> Prisma (ahora) -> PostgreSQL (luego)

## Etapa 2: Prisma 8

Esta etapa contempla la integración de **Prisma 8** con el backend desarrollado en **NestJS**, con el objetivo de permitir posteriormente la conexión y gestión de la base de datos PostgreSQL.

Como referencia principal se utiliza la documentación oficial:

- [Prisma + NestJS](https://docs.prisma.io/docs/guides/frameworks/nestjs)
- [Prisma Getting Started](https://docs.prisma.io/docs/getting-started)

**Importante**

Guía de referencia visual  sobre cómo se integra NestJS, Prisma y PostgreSQL en una aplicación profesional.

- [Explicacion en youtube](https://www.youtube.com/watch?v=iD3TJJBk_Us&list=PLQbmrL9zPupX6E8pqdLGggoqoBHa1ODOH)

### 1. Instalación de Prisma CLI

Prisma CLI proporciona las herramientas necesarias para administrar Prisma desde la línea de comandos, permitiendo ejecutar acciones como inicializar el proyecto, generar migraciones, generar el cliente y utilizar Prisma Studio.

Se instala como dependencia de desarrollo:

```bash
npm install prisma@latest --save-dev
```

### 2. Instalación de Prisma Client

`@prisma/client` es la biblioteca que permite que la aplicación NestJS interactúe con la base de datos mediante Prisma y realice consultas con tipado seguro.

Se instala como dependencia:

```bash
npm install @prisma/client@latest
```

### 3. Inicialización de Prisma

Para inicializar Prisma en el proyecto 

```bash
npx prisma@latest init
```

La inicialización genera la configuración necesaria para comenzar a trabajar con Prisma.

En TRIBUTEK, esta inicialización ya fue realizada y se generó el archivo `prisma.config.ts`.

### Estado actual

La versión instalada actualmente es:

```text
Prisma 8.0.0-rc.13
```

La estructura del backend relacionada con Prisma se continuará configurando en las siguientes etapas, incluyendo:

```text
PostgreSQL
    ↓
DATABASE_URL
    ↓
Prisma
    ↓
NestJS
    ↓
API
```
Siguiente paso en el archivo 

- [Instalacion-prisma-PosgreSQL.MD](tributek/Instalacion-prisma-PosgreSQL.MD)

