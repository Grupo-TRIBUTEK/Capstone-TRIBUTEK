# Backend - TRIBUTEK

Backend de la plataforma **TRIBUTEK**, desarrollado con NestJS y conectado a PostgreSQL mediante Prisma 8.

## Tecnologías

* **NestJS 12**
* **TypeScript**
* **Prisma 8**
* **PostgreSQL**
* **Node.js**
* **npm**

## Estructura actual

```text
backend/
├── prisma/
│   ├── contract.d.ts
│   ├── contract.json
│   └── contract.prisma
│
└── src/
    ├── auth/
    │   ├── dto/
    │   │   └── login.dto.ts
    │   ├── auth.controller.ts
    │   ├── auth.module.ts
    │   └── auth.service.ts
    │
    ├── clientes/
    │   ├── clientes.controller.ts
    │   ├── clientes.module.ts
    │   └── clientes.service.ts
    │
    ├── prisma/
    │   ├── db.ts
    │   ├── prisma.module.ts
    │   └── prisma.service.ts
    │
    ├── usuario/
    │   ├── usuario.controller.ts
    │   ├── usuario.module.ts
    │   └── usuario.service.ts
    │
    ├── app.controller.ts
    ├── app.module.ts
    ├── app.service.ts
    └── main.ts
```

## Módulos principales

### Auth

Gestiona la autenticación de los usuarios.

Actualmente se encuentra configurado el endpoint:

```text
POST /auth/login
```

La implementación del inicio de sesión contempla posteriormente la búsqueda del usuario, verificación de contraseña y generación de sesión mediante JWT.

### Usuario

Módulo destinado a la gestión de las cuentas de usuario del sistema.

### Clientes

Módulo destinado a la gestión de los clientes de TRIBUTEK.

### Prisma

Contiene la integración de Prisma 8 con NestJS y PostgreSQL.

Se utiliza el sistema de **Data Contracts de Prisma 8**, por lo que el proyecto no utiliza `@prisma/client` ni el `PrismaClient` tradicional.

## Ejecución

Desde la carpeta `backend`:

```powershell
npm install
```

Para iniciar el backend en modo desarrollo:

```powershell
npm run start:dev
```

Para comprobar que el proyecto compila:

```powershell
npm run build
```

El backend se ejecuta mediante NestJS y expone los controladores definidos en los módulos de la aplicación.

## Estado actual

* [x] Configuración de NestJS
* [x] Integración con PostgreSQL
* [x] Integración de Prisma 8
* [x] Configuración de `PrismaModule` y `PrismaService`
* [x] Módulo de autenticación
* [x] Endpoint `POST /auth/login`
* [ ] Implementación completa de autenticación
* [ ] Verificación de contraseñas
* [ ] Generación y validación de JWT
* [ ] Protección de rutas mediante autenticación y roles
