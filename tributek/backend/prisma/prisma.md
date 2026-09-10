# Prisma

**Referencia:** [Documentación oficial de Prisma](https://www.prisma.io/docs/orm/core-concepts)

Prisma se utilizará junto con **NestJS** y **PostgreSQL** para definir y gestionar los modelos de datos del sistema TRIBUTEK.

El archivo `contract.prisma` contiene los modelos, campos y relaciones de la base de datos mediante **Prisma Schema Language (PSL)**.

## Configuración inicial

Los comandos se ejecutan desde:

```bash
cd tributek/backend
```

### Comandos utilizados

```bash
npm install
```

Instala las dependencias del proyecto.

```bash
npx prisma --help
```

Muestra los comandos disponibles de Prisma.

```bash
npx prisma contract --help
```

Muestra los comandos disponibles para trabajar con el contrato de datos.

```bash
npx prisma db --help
```

Muestra los comandos disponibles para gestionar la base de datos.

## Contrato de datos

El archivo:

```text
prisma/contract.prisma
```

define los modelos de datos y sus relaciones.

### Formatear el contrato

```bash
npx prisma contract format
```

Formatea `contract.prisma` y permite comprobar que su estructura pueda ser procesada por Prisma.

### Emitir el contrato

```bash
npx prisma contract emit
```

Interpreta el contrato y genera los artefactos necesarios para trabajar con los modelos definidos:

```text
prisma/contract.json
prisma/contract.d.ts
```

## Solución al error `CONTRACT.SOURCE_LOAD_FAILED`

Inicialmente, `contract emit` producía el error:

```text
CONTRACT.SOURCE_LOAD_FAILED
PSL to SQL contract interpretation failed
```

El problema estaba relacionado con la sintaxis de los tipos nativos de PostgreSQL utilizada en `contract.prisma`.

Se utilizaba:

```prisma
String @db.VarChar(30)
DateTime @db.Date
DateTime @db.Timestamptz
Int @db.SmallInt
```

Se corrigió utilizando directamente los tipos del contrato:

```prisma
VarChar(30)
Date
Timestamptz
SmallInt
```

Después de esta modificación, `npx prisma contract emit` se ejecutó correctamente y generó `contract.json` y `contract.d.ts`.

### Tipos no soportados al agregar tablas

Al agregar las tablas restantes, `contract emit` también puede mostrar el error:

```text
PSL_UNSUPPORTED_FIELD_TYPE
Field "..." type "Text" is not supported in SQL PSL provider v1
```

El proveedor SQL PSL v1 no admite el tipo `Text` en el contrato. Se debe reemplazar
por `VarChar` indicando una longitud explícita:

```prisma
urlArchivo  VarChar(500)
observacion VarChar(1000)?
detalle     VarChar(1000)?
```

Para los campos decimales, se debe utilizar `Numeric` en lugar de `Decimal`:

```prisma
ivaDebito  Numeric(14, 2)
montoTotal Numeric(14, 2)
```

Después de corregir estos tipos, comprobar la emisión desde `tributek/backend`:

```bash
npx prisma contract emit
```

El comando debe finalizar con `Resolving contract source...` y `Emitting contract...`
en estado correcto, generando nuevamente `prisma/contract.json` y `prisma/contract.d.ts`.

## Relaciones iniciales

Las primeras tablas implementadas son:

* `Rol`
* `Usuario`
* `Cliente`
* `UsuarioCliente`
* `Servicio`
* `ClienteServicio`
* `PeriodoCliente`

Relaciones:

```text
Rol 1 ─── N Usuario

Usuario N ─── M Cliente
       mediante UsuarioCliente

Cliente 1 ─── N Servicio
       mediante ClienteServicio

Cliente 1 ─── N PeriodoCliente
```


## Inicializar la base de datos 

Cuando no se han creado las tablas en posgreSQL, ejecutar desde el backend

- npx prisma db init

## Verificar la base de datos

comprobar que PostgreSQL coincide con el contrato mediante:

npx prisma db verify

## Siguientes pasos

- Crear el PrismaService en NestJS.
- Configurar la conexión de la aplicación con Prisma.
- Probar una consulta simple, por ejemplo obtener los Rol.
- Posteriormente implementar autenticación (Usuario, hash de contraseña, JWT, etc.).