# Prisma

**Referencia:** [Documentación oficial de Prisma](https://www.prisma.io/docs/orm/core-concepts)

Prisma se utiliza junto con **NestJS** y **PostgreSQL** para definir y gestionar los modelos de datos del sistema TRIBUTEK.

El archivo `contract.prisma` contiene los modelos, campos y relaciones de la base de datos mediante **Prisma Schema Language (PSL)**.

> Esta guía está orientada a los integrantes del equipo que necesitan configurar el proyecto TRIBUTEK en un equipo nuevo después de clonar el repositorio.

---

## 1. Requisitos

Antes de comenzar, se debe tener instalado:

* Node.js
* npm
* PostgreSQL
* Git

El proyecto utiliza Prisma 8 y su configuración se encuentra dentro de:

```text
tributek/backend
```

---

## 2. Clonar el repositorio

Clonar el repositorio del proyecto:

```bash
git clone <URL_DEL_REPOSITORIO>
```

Ingresar al proyecto:

```bash
cd tributek
```

---

## 3. Instalar las dependencias

Ingresar al backend:

```bash
cd backend
```

Instalar las dependencias:

```bash
npm install
```

Esto instala las versiones de Prisma y del resto de las dependencias definidas por el proyecto.

---

## 4. Configurar PostgreSQL

Cada integrante debe tener una base de datos PostgreSQL local para trabajar.

Por ejemplo:

```text
Base de datos: TRIBUTEK
Usuario: postgres
Puerto: 5432
```

Los datos pueden variar según la configuración de PostgreSQL de cada integrante.

---

## 5. Configurar `.env`

Dentro de:

```text
tributek/backend
```

crear un archivo:

```text
.env
```

con la conexión correspondiente a la instalación local de PostgreSQL:

```env
DATABASE_URL="postgresql://USUARIO:CONTRASEÑA@localhost:5432/TRIBUTEK"
```

Por ejemplo:

```env
DATABASE_URL="postgresql://postgres:123456@localhost:5432/TRIBUTEK"
```

> Cada integrante debe utilizar sus propias credenciales de PostgreSQL.
>
> El archivo `.env` no debe subirse al repositorio.

---

# 6. Verificar la configuración de Prisma

Desde:

```bash
tributek/backend
```

se pueden consultar los comandos disponibles:

```bash
npx prisma --help
```

Para consultar los comandos relacionados con el contrato:

```bash
npx prisma contract --help
```

Para consultar los comandos relacionados con la base de datos:

```bash
npx prisma db --help
```

---

# 7. Revisar el contrato de datos

El proyecto ya contiene el contrato:

```text
backend/
└── prisma/
    └── contract.prisma
```

Este archivo define las tablas, campos y relaciones utilizadas por TRIBUTEK.

**No se debe crear otro `contract.prisma`.**

Los integrantes deben utilizar el contrato que se encuentra en el repositorio.

---

# 8. Formatear el contrato

Desde:

```bash
cd tributek/backend
```

ejecutar:

```bash
npx prisma contract format
```

Esto permite comprobar y formatear la estructura del contrato.

---

# 9. Emitir el contrato

Ejecutar:

```bash
npx prisma contract emit
```

Este comando interpreta `contract.prisma` y genera los artefactos necesarios:

```text
backend/
└── prisma/
    ├── contract.prisma
    ├── contract.json
    └── contract.d.ts
```

Si el comando finaliza correctamente, el contrato está listo para ser utilizado por la aplicación.

---

# 10. Crear las tablas de la base de datos

Si la base de datos PostgreSQL del integrante está vacía y todavía no contiene las tablas de TRIBUTEK, ejecutar:

```bash
npx prisma db init
```

Este proceso utiliza el contrato existente para inicializar la estructura de la base de datos.

> Este paso se realiza solamente cuando se está configurando una base de datos local nueva.

No se debe ejecutar nuevamente de forma innecesaria sobre una base de datos que ya fue inicializada.

---

# 11. Verificar la base de datos

Después de inicializar la base de datos, ejecutar:

```bash
npx prisma db verify
```

El objetivo es comprobar que la estructura de PostgreSQL coincide con el contrato definido por el proyecto.

Una verificación correcta debe mostrar:

```text
✔ Database marker and schema match contract
```

---

# 12. Estructura esperada

Después de completar la configuración, la estructura relacionada con Prisma debe ser similar a:

```text
tributek/
└── backend/
    ├── prisma/
    │   ├── contract.prisma
    │   ├── contract.json
    │   └── contract.d.ts
    │
    ├── src/
    │   └── prisma/
    │       ├── db.ts
    │       ├── prisma.module.ts
    │       └── prisma.service.ts
    │
    ├── prisma.config.ts
    ├── .env
    └── package.json
```

---

# 13. Relaciones principales

El contrato actual contiene, entre otras, las siguientes entidades:

```text
Rol
 │
 └── 1:N ── Usuario
                │
                └── N:M ── Cliente
                     mediante UsuarioCliente

Cliente
 │
 ├── 1:N ── Servicio
 │           mediante ClienteServicio
 │
 └── 1:N ── PeriodoCliente
```

Las tablas deben ser generadas a partir del contrato existente.

---

# 14. Errores conocidos del contrato

Durante la configuración inicial del proyecto se detectaron algunas incompatibilidades con los tipos utilizados por SQL PSL.

### Tipos nativos de PostgreSQL

Se utilizaban inicialmente:

```prisma
String @db.VarChar(30)
DateTime @db.Date
DateTime @db.Timestamptz
Int @db.SmallInt
```

Se corrigieron utilizando directamente los tipos soportados por el contrato:

```prisma
VarChar(30)
Date
Timestamptz
SmallInt
```

### Tipo `Text`

El proveedor SQL PSL v1 no admite:

```prisma
Text
```

Por lo tanto, se deben utilizar tipos `VarChar` con una longitud definida:

```prisma
urlArchivo  VarChar(500)
observacion VarChar(1000)?
detalle     VarChar(1000)?
```

### Tipo `Decimal`

Para valores decimales se utiliza:

```prisma
Numeric(14, 2)
```

en lugar de:

```prisma
Decimal
```

Si se modifica el contrato, comprobar nuevamente:

```bash
npx prisma contract emit
```

---

# 15. Flujo para un integrante nuevo

Para una instalación nueva, el flujo resumido es:

```text
Clonar repositorio
       ↓
cd tributek/backend
       ↓
npm install
       ↓
Crear base de datos PostgreSQL
       ↓
Configurar .env
       ↓
npx prisma contract format
       ↓
npx prisma contract emit
       ↓
npx prisma db init
       ↓
npx prisma db verify
       ↓
Base de datos lista
```

---

# 16. Cuando otro integrante modifica el contrato

Si un integrante modifica:

```text
prisma/contract.prisma
```

debe comunicar el cambio al equipo.

Después de obtener la nueva versión del repositorio, los demás integrantes deben:

1. Actualizar el repositorio:

```bash
git pull
```

2. Revisar el nuevo `contract.prisma`.

3. Emitir nuevamente el contrato:

```bash
npx prisma contract emit
```

4. Actualizar su base de datos local según el procedimiento acordado por el equipo.

5. Verificar:

```bash
npx prisma db verify
```

> No se debe modificar el contrato de manera independiente sin coordinarlo con el equipo, ya que define la estructura común de la base de datos.

---

# 17. Importante

Cada integrante tiene su propia instalación local de PostgreSQL:

```text
Brandon
PostgreSQL local
      ↓
Base TRIBUTEK

Nazaret
PostgreSQL local
      ↓
Base TRIBUTEK
```

Las bases de datos son independientes, pero ambas deben utilizar el mismo:

```text
prisma/contract.prisma
```

De esta manera, todos los integrantes trabajan con la misma estructura de datos.

---

# 18. Siguientes pasos

Una vez verificada la base de datos, se puede continuar con:

* Configuración de `PrismaService` en NestJS.
* Conexión de NestJS con PostgreSQL.
* Consultas mediante el runtime de Prisma 8.
* Pruebas de lectura y escritura.
* Implementación de usuarios y roles.
* Autenticación mediante contraseña, Argon2 y JWT.
