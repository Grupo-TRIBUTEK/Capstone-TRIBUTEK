## Etapa 3: Configuración de PostgreSQL y continuación de Prisma (Por validar los pasos realiados)

Luego de realizar la integración inicial de Prisma con el backend en la etapa anterior, continuamos preparando el entorno de base de datos que utilizará TRIBUTEK.

En esta etapa se configuró PostgreSQL, se creó la base de datos del proyecto y se continuó revisando la configuración de Prisma para conectarlo posteriormente con PostgreSQL.

### 3.1 Instalación y revisión de PostgreSQL

Primero verificamos que PostgreSQL estuviera instalado correctamente en el equipo.

Al intentar utilizar `psql` directamente desde PowerShell, el comando no fue reconocido porque la carpeta de PostgreSQL no estaba agregada al PATH de Windows.

En lugar de reinstalar PostgreSQL, revisamos la carpeta de instalación y encontramos PostgreSQL 18.

Comprobamos la versión utilizando:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --version
```

El resultado fue:

```text
psql (PostgreSQL) 18.6
```

Con esto confirmamos que PostgreSQL estaba instalado correctamente.

### 3.2 Revisión del servicio de PostgreSQL

También verificamos que el servicio de PostgreSQL estuviera ejecutándose en Windows:

```powershell
Get-Service postgresql*
```

El servicio encontrado fue:

```text
postgresql-x64-18
```

y se encontraba en ejecución.

### 3.3 Conexión a PostgreSQL

Para comprobar que podíamos acceder al servidor, ingresamos mediante `psql`:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres
```

La conexión fue exitosa y pudimos acceder a la consola de PostgreSQL:

```text
postgres=#
```

### 3.4 Creación de la base de datos

Una vez dentro de PostgreSQL, creamos la base de datos que utilizará TRIBUTEK:

```sql
CREATE DATABASE "BD_TRIBUTEK";
```

Luego verificamos que apareciera correctamente mediante:

```sql
\l
```

La base de datos `BD_TRIBUTEK` apareció en el listado.

Finalmente, nos conectamos directamente a ella:

```sql
\c BD_TRIBUTEK
```

PostgreSQL confirmó:

```text
You are now connected to database "BD_TRIBUTEK"
```

Con esto dejamos creada y accesible la base de datos del proyecto.

### 3.5 Configuración de las variables de entorno

Dentro de la carpeta `backend` creamos el archivo:

```text
.env
```

Este archivo se utiliza para guardar la información de conexión a PostgreSQL sin escribirla directamente dentro del código.

La estructura utilizada es:

```env
DATABASE_URL="postgresql://USUARIO:CONTRASEÑA@localhost:5432/BD_TRIBUTEK"
```

La contraseña real no se incluye en el repositorio por motivos de seguridad.

### 3.6 Revisión de la configuración de Prisma

Como Prisma ya había sido instalado e inicializado durante la etapa anterior, en esta etapa no se volvió a realizar su instalación.

Durante la revisión de las dependencias encontramos que `@prisma/client` correspondía inicialmente a una versión de Prisma 7, mientras que el proyecto estaba utilizando Prisma 8.

Para evitar mezclar versiones diferentes, se desinstaló `@prisma/client` mediante:

```powershell
npm uninstall @prisma/client
```

La desinstalación se realizó correctamente.

La versión de Prisma utilizada actualmente es:

```text
Prisma 8.0.0-rc.13
```

### 3.7 Revisión de la configuración existente

La configuración de Prisma realizada durante la etapa anterior se encuentra en:

```text
backend/prisma.config.ts
```

En esta etapa continuamos trabajando sobre dicha configuración, sin volver a inicializar Prisma desde cero.

También se creó la carpeta:

```text
backend/prisma/
```

y dentro de ella el archivo:

```text
schema.prisma
```

Por ahora, este archivo se encuentra creado pero todavía no contiene el modelo definitivo de la base de datos de TRIBUTEK.

### 3.8 Prueba de la CLI de Prisma

Durante la configuración intentamos utilizar:

```powershell
npx prisma validate
```

Sin embargo, Prisma respondió que el comando `validate` no estaba registrado.

Esto se debe a que la versión de Prisma utilizada corresponde a la nueva CLI de Prisma 8, cuya estructura de comandos es diferente a versiones anteriores.

Para comprobar que Prisma estaba disponible correctamente ejecutamos:

```powershell
npx prisma --help
```

El comando funcionó y mostró las opciones disponibles de la nueva CLI.

### 3.9 Intento de inicialización mediante Prisma ORM

También probamos el comando recomendado actualmente para agregar Prisma ORM a un proyecto existente con PostgreSQL:

```powershell
npx prisma@latest orm init --target postgres
```

Durante el proceso seleccionamos:

* **Prisma Schema Language (.prisma)** como lenguaje del esquema.
* Se propuso `src/prisma/contract.prisma` como ubicación del esquema.

Sin embargo, Prisma detectó que ya existía un archivo `prisma.config.ts` y mostró una advertencia indicando que la inicialización podía reemplazar dicha configuración.

Para evitar sobrescribir la configuración que ya habíamos realizado, cancelamos el proceso utilizando `Ctrl + C`.

Por lo tanto, **esta inicialización no se considera completada**.

Después de cancelarla verificamos los archivos del proyecto y comprobamos que no se hubiera creado accidentalmente un `contract.prisma`.

### 3.10 Estado actual

Hasta este punto, PostgreSQL ya se encuentra preparado y la base de datos de TRIBUTEK fue creada.

La configuración de Prisma, sin embargo, todavía requiere algunos pasos antes de considerar terminada esta etapa.


La siguiente actividad será terminar correctamente la configuración de Prisma con PostgreSQL y comprobar la conexión antes de comenzar con el modelado definitivo de las entidades de TRIBUTEK.

---

## Integración Prisma 8 con PostgreSQL - (OK)

### 1. Instalación de `@prisma/orm-postgres`

Se instaló el componente de PostgreSQL para Prisma 8:

```powershell
npm install @prisma/orm-postgres
```

Versiones utilizadas:

```text
prisma@8.0.0-rc.13
@prisma/orm-postgres@8.0.0-rc.8
```

### 2. Configuración de `prisma.config.ts`

Se adaptó `prisma.config.ts` al flujo de Prisma 8 utilizando `@prisma/orm-postgres` y la variable `DATABASE_URL`.

Configuración utilizada:

```ts
import "dotenv/config";
import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./prisma/contract.prisma",
    db: {
      connection: process.env["DATABASE_URL"]!,
    },
  }),
  skills: {
    agents: ["claude", "cursor", "agents", "devin"],
  },
});
```

### 3. Comprobación de la configuración

Se ejecutó:

```powershell
npx prisma --help
```

La CLI funcionó correctamente y cargó la configuración de Prisma.

### 4. Creación de un contrato temporal

Para comprobar el funcionamiento del flujo de Prisma 8 antes de comenzar el modelado de TRIBUTEK, se creó temporalmente:

```text
prisma/contract.prisma
```

con un modelo de prueba:

```prisma
model Test {
  id Int @id @default(autoincrement())
}
```

### 5. Emisión del contrato

Se ejecutó:

```powershell
npx prisma contract emit
```

La operación fue exitosa y generó:

```text
prisma/contract.json
prisma/contract.d.ts
```

### 6. Prueba de conexión con PostgreSQL

Para comprobar la integración sin modificar la base de datos, se ejecutó:

```powershell
npx prisma db init --dry-run
```

Prisma pudo acceder correctamente a la base de datos:

```text
BD_TRIBUTEK
```

y detectó que el contrato temporal requeriría crear la tabla `test`.

La prueba se realizó mediante `dry run`, por lo que:

```text
No se realizaron cambios en la base de datos.
```


```

La integración entre **Prisma 8 y PostgreSQL quedó comprobada correctamente**.

El modelo `Test` utilizado durante las pruebas es temporal y debe eliminarse antes de comenzar el modelado definitivo de TRIBUTEK.

**Siguiente paso:** limpiar el modelo de prueba y comenzar el modelado de las entidades de TRIBUTEK.

---

## Versiones finales de cada tecnología

* NestJS: `12.0.1`
* Nest CLI: `12.0.0`
* TypeScript: `6.0.2`
* Node types: `24.0.0`
* ES Modules: `"type": "module"`
* Prisma: `8.0.0-rc.13`
* `@prisma/orm-postgres`: `8.0.0-rc.8`
* PostgreSQL / psql: `18.6`
