# 03 · Flujo de migración con Prisma

> **Propósito:** dejar por escrito el ciclo que se repite cada vez que se
> cambia el modelo de datos, para que cualquiera del equipo ejecute los mismos
> pasos en el mismo orden y entienda qué hace cada comando y por qué.
>
> Este documento es un **procedimiento recurrente**, no una guía de instalación.
> Para el detalle del contrato y los artefactos generados, ver
> [02-flujo-prisma.md](02-flujo-prisma.md).

## Cuándo se aplica

Cada vez que modifiques `prisma/contract.prisma` y ese cambio deba llegar a la
base de datos: agregar columnas, cambiar tipos, crear tablas, índices o claves
foráneas.

## Por qué existe un flujo de cinco pasos

Editar `contract.prisma` **nunca** cambia la base por sí solo. Son dos acciones
separadas —declarar y aplicar—, y por eso existen comandos distintos para cada
una. Confundirlas es la causa más común de errores.

> **Regla de oro:** el contrato declara, la migración aplica, la verificación
> confirma.

Además, este proyecto tiene un antecedente: el repositorio **no tenía ningún
`migration.sql`**, solo un snapshot y una referencia. Es decir, el esquema estaba
declarado pero nunca aplicado. Por eso conviene que todo el equipo siga el mismo
camino.

---

## Las 5 etapas

### 1 · Declarar el cambio

Edita `prisma/contract.prisma`, el único archivo editable del modelo.

```prisma
model Transaccion {
  folio         VarChar(50) @map("folio")        // nuevo campo
  tipoDocumento VarChar(20) @map("tipo_documento")
  // ...
}
```

Usa `@map("nombre_snake_case")` para que las columnas en PostgreSQL respeten la
convención del resto del esquema (ver `Documento.nombreArchivo` →
`nombre_archivo`).

**No edites `contract.json` ni `contract.d.ts`.** Son artefactos generados.

### 2 · Formatear y emitir

```powershell
cd tributek/backend
npx prisma contract format
npx prisma contract emit
```

| Comando | Qué hace | Por qué importa |
| --- | --- | --- |
| `contract format` | Normaliza el estilo del `.prisma` | Evita ruido de formato en el diff |
| `contract emit` | Genera `contract.json` y `contract.d.ts` | Son los que lee el runtime de NestJS y la CLI |

Ambos son **offline**: no tocan la base de datos.

> Es el paso que más se olvida. Si te saltas `emit`, el código seguirá viendo
> los tipos antiguos y la consulta fallará en runtime con un error confuso.

### 3 · Planificar

```powershell
npx prisma migration plan
```

Compara el contrato contra la base y **genera el paquete de migración** con el
SQL que haría falta. No ejecuta nada: solo muestra.

**Revisa el SQL antes de seguir.** Aquí se detecta un error de diseño —un tipo
incompatible, una columna NOT NULL sobre una tabla con datos— sin haber tocado
la base.

### 4 · Aplicar

```powershell
npx prisma db migrate
```

Ejecuta la migración contra `DATABASE_URL`.

> ⚠️ **Este sí cambia la base de datos.** Coordina con el equipo antes de correrlo
> contra una base compartida. Para una base local nueva, revisa las precauciones
> en [01-configuracion-postgresql.md](01-configuracion-postgresql.md).

### 5 · Verificar

```powershell
npx prisma db verify
```

Consulta la base y confirma que el esquema real coincide con lo que declara el
contrato. No crea ni modifica nada.

---

## Resumen

```powershell
# 1. Editar prisma/contract.prisma (fuera de la terminal)

# 2. Emitir artefactos
npx prisma contract format
npx prisma contract emit

# 3. Ver el SQL que se aplicaría
npx prisma migration plan

# 4. Aplicar (cambia la base)
npx prisma db migrate

# 5. Confirmar
npx prisma db verify
```

| Etapa | Comando | Toca la base |
| --- | --- | --- |
| 1. Declarar | editar `contract.prisma` | No |
| 2. Emitir | `contract format` + `contract emit` | No |
| 3. Planificar | `migration plan` | No |
| 4. Aplicar | `db migrate` | **Sí** |
| 5. Verificar | `db verify` | No |

**Solo la etapa 4 es destructiva.** Las demás son seguras y se pueden repetir
sin riesgo.

---

## Comandos de apoyo

Cuando algo no cuadra. Todos son de lectura y no modifican nada.

| Comando | Para qué sirve |
| --- | --- |
| `migration status` | Ver el camino de migración y qué falta aplicar |
| `migration log` | Historial de migraciones ya ejecutadas |
| `migration list` | Migraciones que existen en disco |
| `migration check` | Verificar la integridad de artefactos y grafo |
| `migration show <target>` | Ver el contenido de un paquete de migración |
| `migration graph` | Topología del grafo de migraciones |

Si una migración quedó a medias, `migration status` y `migration log` dicen en
qué estado está antes de intentar cualquier otra cosa.

---

## Checklist antes de aplicar

- [ ] El cambio en `contract.prisma` está revisado con el equipo
- [ ] `contract format` y `contract emit` corrieron, y el diff se incluye en el commit
- [ ] `migration plan` genera SQL razonable (no borra datos sin querer)
- [ ] Si afecta una tabla con datos, se revisó el impacto
- [ ] Existe plan de reversa si la migración no se puede deshacer

---

## Errores frecuentes

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| La consulta falla con un campo que sí está en el `.prisma` | Falta `contract emit` | Repetir la etapa 2 |
| `migration plan` no detecta el cambio | La base difiere de lo que se asumía | `migration status` y `migration log` |
| Columna NOT NULL sobre tabla poblada | El SQL no puede completarse | Definir default, hacerlo nullable, o migrar en dos pasos |
| `db verify` falla tras migrar | La base quedó desalineada | No reintentar a ciegas; revisar el log primero |

> Ante un error parecido a estos, revisa también
> [98-incidencias-prisma.md](98-incidencias-prisma.md).

---

## Documentos relacionados

| Documento | Cuándo consultarlo |
| --- | --- |
| [02-flujo-prisma.md](02-flujo-prisma.md) | Entender el contrato y los artefactos emitidos |
| [01-configuracion-postgresql.md](01-configuracion-postgresql.md) | Configurar `DATABASE_URL` o una base local |
| [98-incidencias-prisma.md](98-incidencias-prisma.md) | Cuando un error se parezca a los de la tabla anterior |

## Estado actual de las migraciones

Al momento de escribir este documento, el repositorio contenía una referencia en
`migrations/app/refs/db.json` y un snapshot del contrato. Si ya existe una
carpeta `migrations/app/<timestamp>_baseline/`, significa que la migración
baseline se generó y este documento pasa a describir el ciclo **para los
cambios siguientes**.
<!--CONT-->
