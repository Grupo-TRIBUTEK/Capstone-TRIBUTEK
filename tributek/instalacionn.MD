# Instalación de las herramientas del proyecto 

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
|

La selección de ESM (ES Modules) corresponde a la configuración moderna del sistema de módulos de JavaScript y se encuentra asociada al uso de Vitest para las pruebas.

No se habilitó la observabilidad automática, ya que esta funcionalidad no es necesaria para la configuración inicial del proyecto.



## 3. Arquitectura inicial del proyecto

```
tributek/
├── frontend/  <-- Next.js + React
│
├── backend/   <-- NestJS + TypeScript
│
└── README.md
```

Esta separación permite mantener independientes las responsabilidades del frontend y backend, facilitando posteriormente el **desarrollo**, **mantenimiento** y **escalabilidad** del sistema.

## Conclusiones iniciales 

En esta etapa se configuro la estructura base del proyecto TRIBUTEK, separando el frontend y el backend en directorios independientes.

Para el frontend se utilizara **Next.js**, mientras que para el backend se utilizara **NestJS** como framework encargado de implementar la logica de negocio y la API. 

La configuración inicial de NestJS se realizo utilizando **npm** como [gestor de paquetes](https://www.google.com/search?q=que+es+un+gestor+de+paquetes+por+ejemplo+npm&oq=que+es+un+gestor+de+paquetes+por+ejemplo+npm&gs_lcrp=EgZjaHJvbWUyBggAEEUYOdIBCDc2OTdqMGo3qAIAsAIA&sourceid=chrome&source=chrome.ob&ie=UTF-8), ESM (ES modules) como sistema de modulos y con la opción de sin habilitar la observabildiad automatica.

Esta estructura permitirá incorporar posteriormente las demás tecnologías y dependencias necesarias para el desarrollo del sistema, como Prisma, PostgreSQL, autenticación mediante JWT, Argon2, generación de documentos, almacenamiento de archivos y otras herramientas requeridas por el proyecto.