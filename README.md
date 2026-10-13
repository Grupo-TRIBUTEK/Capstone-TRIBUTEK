# Sistema web de gestión TRIBUTEK


TRIBUTEK es una oficina de contabilidad y remuneraciones que necesita reunir la información de sus clientes en un mismo lugar. Antes del proyecto, parte del trabajo se realizaba en planillas y otras herramientas separadas, lo que dificultaba revisar los pagos, los documentos y las obligaciones de cada mes.

Este sistema busca apoyar esa gestión diaria. Permite trabajar por cliente y período, registrar movimientos, mantener sus respaldos y preparar información para entregar al cliente. Su desarrollo está a cargo de Nazaret González y Brandon Casas, como proyecto de Capstone, vinculado también a la práctica profesional de Nazaret en TRIBUTEK.

<img src="tributek/img/TRIBUTEK-capstone.png" alt="Presentación del proyecto TRIBUTEK" width="800">

**Estado - 13 de octubre de 2026**

## El trabajo dentro del sistema
La administradora selecciona el período que necesita revisar y busca al cliente por nombre o RUT. Desde su ficha puede consultar los conceptos del mes, registrar abonos y preparar un mensaje con los montos pendientes. Los períodos anteriores se conservan para consultar el historial.

Las secciones del panel cumplen las siguientes funciones:

| Sección | Para qué se utiliza |
| --- | --- |
| Inicio | Reúne indicadores y pendientes para orientar la revisión del mes. |
| Clientes | Permite registrar y actualizar antecedentes, abrir la ficha y gestionar el acceso al portal. |
| Obligaciones | Organiza los conceptos y montos de cada período, los abonos y los saldos pendientes. |
| Facturación | Prepara el registro de los servicios mensuales y otros servicios. Permite anotar el número de factura, la fecha y las observaciones. No emite documentos tributarios electrónicos ante el SII. |
| Pagos | Muestra los movimientos registrados, su aplicación, el método de pago y las cuentas de origen y destino cuando corresponda. |
| Postergaciones | Registra un monto postergado desde su obligación de origen, con vencimiento y saldo propios. |
| Constitución de empresas | Permite dar seguimiento a las etapas del proceso, sus fechas, observaciones y documentos. La ruta interna conserva el nombre `formalizaciones`. |
| Proyección F29 | Prepara una estimación mensual a partir de registros de compras, ventas y antecedentes ingresados por la administradora. |

Los nombres de los conceptos se han precisado según el trabajo de la oficina. Por ejemplo, se utiliza **Cotizaciones previsionales** y **Cuotas de convenio de deuda con TGR**, en referencia a la Tesorería General de la República. El **Reembolso de gastos por cuenta del cliente** corresponde a dinero que TRIBUTEK pagó en su momento por el cliente y que este debe devolver. Se considera un monto por cobrar, pero se presenta separado de los ingresos por servicios. En los registros internos se mantiene la clave histórica `Cobranza` para conservar la compatibilidad con los datos anteriores.

### Pagos y sus respaldos
Un pago puede aplicarse a un concepto determinado o distribuirse entre deudas, comenzando por las más antiguas. El sistema calcula el saldo restante y valida que el abono no supere lo pendiente. La glosa es opcional, ya que el método de pago tiene su propio campo.

Cada movimiento puede tener una carpeta con varios comprobantes en PDF, PNG o JPG. Esto permite respaldar, por ejemplo, un pago realizado en dos transferencias o mediante distintos medios. Tanto la administradora como el cliente autorizado pueden adjuntar archivos.

Los datos ingresados al adjuntar un comprobante sirven como respaldo. Cargar una imagen no registra un nuevo abono ni modifica por sí solo el saldo del cliente.

### Proyección mensual F29
La sección F29 reúne en una hoja de trabajo la información que necesita la administradora para preparar la proyección. Admite archivos CSV del Registro de Compras y Ventas (RCV), permite buscar archivos por RUT y período en una carpeta autorizada y también ofrece importación manual.

Con los antecedentes cargados, calcula el IVA estimado por pagar o el remanente y presenta por separado las otras obligaciones. Incluye campos para el remanente anterior, PPM, retenciones, cotizaciones previsionales y honorarios, entre otros. Las notas de crédito se muestran con valores negativos y en rojo.

La administradora puede revisar el resultado, copiar el mensaje correspondiente y generar una imagen del informe para el cliente. La exportación conserva un fondo claro aunque la página esté en modo oscuro.

Esta sección prepara una **proyección informativa**. No presenta el Formulario 29 ante el Servicio de Impuestos Internos ni realiza su pago. Los mensajes se copian para que la administradora los revise y envíe, no se despachan automáticamente por WhatsApp.

### Portal del cliente
El portal permite consultar y entregar documentos, revisar material de presentación y acceder a las carpetas de comprobantes de las empresas vinculadas a la cuenta.

No existe inscripción pública. La administradora habilita el acceso desde la gestión de clientes y entrega un enlace para configurar la cuenta. También puede gestionar el restablecimiento de la contraseña. Un cliente puede estar registrado en TRIBUTEK sin tener acceso al portal.

## Dónde se guarda la información
La conexión con la base de datos se ha incorporado por etapas. Por eso, actualmente conviven información del servidor y registros locales del navegador.

| Información | Situación actual |
| --- | --- |
| Clientes y accesos | Se gestionan mediante el servidor y PostgreSQL. |
| Clientes, Obligaciones y Facturación en el panel | Estas vistas toman los datos del servidor. La ficha también mantiene información local de apoyo y respaldo. |
| Constitución de empresas | El seguimiento de etapas se consulta y guarda mediante el servidor. |
| Inicio, Pagos y Postergaciones | Sus vistas todavía utilizan el registro local del navegador. La sincronización de la gestión mensual está en desarrollo. |
| Proyecciones F29 | Se guardan primero en el navegador y luego se intenta enviarlas al servidor, asociadas al cliente y período. La apertura de la hoja todavía recupera la copia local. |
| Documentos | Sus registros se guardan en la base de datos y los archivos en `tributek/backend/uploads/documentos`. |
| Comprobantes de pago | Los archivos y su índice se guardan en el servidor, en `tributek/backend/uploads/payment-evidence`, salvo que se configure otra ubicación. |

Un aviso de guardado local no confirma que la información haya llegado al servidor. En particular, F29 informa cuando la sincronización no se pudo completar. Todavía no debe asumirse que todas las pantallas mostrarán lo mismo al cambiar de navegador o computador. El respaldo JSON disponible en la interfaz permite conservar los datos locales que exporta cada módulo. No reemplaza el respaldo de PostgreSQL ni incluye los archivos adjuntos guardados en el servidor.

## Organización del proyecto
La aplicación está dentro de la carpeta `tributek`. Las evidencias académicas se mantienen aparte, en `Fase 1`.

```text
Capstone-TRIBUTEK/
├── README.md
├── Fase 1/
└── tributek/
    ├── frontend/       Pantallas, formularios, estilos e informes
    ├── backend/        Accesos, operaciones y conexión con los datos
    ├── docs/           Documentación de instalación y desarrollo
    ├── img/            Imágenes del proyecto
    └── package.json    Comando para iniciar ambas aplicaciones
```

El frontend utiliza **Next.js, React y TypeScript**. Los estilos combinan **Tailwind CSS y CSS compartido**. El backend utiliza **NestJS**, mientras que **Prisma** permite trabajar con **PostgreSQL**. Las dependencias están declaradas en los archivos `package.json` y sus versiones de instalación se conservan en los respectivos `package-lock.json`.

Los colores y las tipografías se definen en `tributek/frontend/app/globals.css`. Los componentes usan esas definiciones para mantener una presentación consistente. La base visual utiliza el azul `#252F46` y el acento `#B98B7B`, con colores específicos para estados, textos y fondos. El sistema dispone de tema claro, oscuro y según la preferencia del equipo.

## Cómo ejecutar una copia local
Se necesita Git, Node.js con npm y una base de datos PostgreSQL. La versión de Prisma incluida requiere Node.js **22.18.0 o superior**. El equipo ha trabajado con Node.js 22.23.2.

Si aún no se tiene una copia del proyecto:

```powershell
git clone https://github.com/Grupo-TRIBUTEK/Capstone-TRIBUTEK.git
cd Capstone-TRIBUTEK
```

Desde la carpeta principal, instalar las dependencias de cada parte. Ejecutar los comandos uno por uno:

```powershell
npm ci --prefix tributek
npm ci --prefix tributek/frontend
npm ci --prefix tributek/backend
```

### Conexión y cuentas
El backend carga su configuración desde el entorno. Para trabajar localmente, se debe preparar `tributek/backend/.env` con los valores del equipo:

```dotenv
DATABASE_URL=postgresql://USUARIO:CLAVE@localhost:5432/BASE_DE_DATOS
JWT_SECRET=REEMPLAZAR_POR_UNA_CLAVE_PRIVADA_LARGA_Y_ALEATORIA
FRONTEND_URL=http://localhost:3000
PORT=3001
```

Estos valores son ejemplos. Las credenciales reales no se incluyen en el repositorio. La cuenta administrativa inicial y la preparación de la base deben coordinarse con quien mantiene el backend, porque no hay un formulario público para crear administradores.

Descargar el código con `git pull` no actualiza las tablas de PostgreSQL. La estructura se encuentra en `tributek/backend/prisma/contract.prisma` y los cambios de base de datos están en `tributek/backend/migrations`. Para aplicarlos, consultar el [procedimiento de migraciones](tributek/docs/03-backend/01-base-datos/03-flujo-prisma-migracion.md) y confirmar a qué base apunta `DATABASE_URL`.

### Iniciar la aplicación
Desde la carpeta `tributek`:

```powershell
npm run dev
```

Este comando inicia el frontend y el backend. La página queda disponible en **http://localhost:3000** y el servidor en **http://localhost:3001**.

También pueden iniciarse por separado, dejando una terminal abierta para cada uno:

```powershell
# Desde tributek/frontend
npm run dev
```

```powershell
# Desde tributek/backend
npm run start:dev
```

Para detenerlos, presionar `Ctrl + C` en la terminal correspondiente. Si la página abre, pero el inicio de sesión indica que no puede conectarse al puerto 3001, revisar que el backend haya iniciado correctamente. Las direcciones del servidor están configuradas en `tributek/frontend/next.config.ts`. Si se cambia el puerto del backend, esa configuración también debe ajustarse.

## Revisión antes de integrar cambios
Desde `tributek/frontend`, ejecutar:

```powershell
npm run lint -- app
npx tsc --noEmit
npm run build -- --webpack
```

Estas comprobaciones revisan el código, los tipos de datos y la construcción de la aplicación. En la revisión de estilos del 12 de octubre de 2026, las tres finalizaron sin errores.

Las pruebas de reglas y sincronización del frontend pueden ejecutarse desde la misma carpeta:

```powershell
node --test tests/ficha.test.mjs tests/management.test.mjs tests/mergeClients.test.mjs tests/f29.test.mjs tests/syncObligaciones.test.mjs
```

Desde `tributek/backend`, los comandos disponibles para revisar el servidor son:

```powershell
npm run lint
npm test
npm run build
```

Que una aplicación compile no confirma por sí solo que un proceso esté completo. También se deben probar las operaciones con ambas cuentas, comprobar los datos guardados y revisar la navegación en distintos tamaños de pantalla y en ambos temas.

## Trabajo pendiente
La prioridad es completar y validar la sincronización de los módulos que todavía dependen del navegador, incluida la recuperación de las proyecciones F29 desde el servidor. También falta consolidar la preparación del entorno, los respaldos y la configuración de despliegue para el uso de la oficina.

Las revisiones con TRIBUTEK permiten ajustar los conceptos y comprobar que los resultados coincidan con su forma de trabajar. Cada incorporación debe probarse junto con los módulos existentes, especialmente cuando cambia el registro de pagos, períodos o saldos.

## Documentación y coordinación
Nazaret González y Brandon Casas desarrollan e integran el sistema de manera conjunta. La distribución de tareas y las evidencias de las entregas se mantienen en el repositorio y en los antecedentes del proyecto académico.

Para revisar una parte específica:

- [Instalación de herramientas](tributek/docs/01-instalacion/01-instalacion-herramientas.md).
- [Configuración de PostgreSQL](tributek/docs/03-backend/01-base-datos/01-configuracion-postgresql.md).
- [Trabajo con el contrato de datos](tributek/docs/03-backend/01-base-datos/02-flujo-prisma.md).
- [Migraciones de la base de datos](tributek/docs/03-backend/01-base-datos/03-flujo-prisma-migracion.md).
- [Acceso desde el frontend](tributek/docs/02-frontend/frontend-auth.md).
- [Organización de componentes](tributek/docs/02-frontend/componentes.md).
- [Funcionamiento de la vista Obligaciones](tributek/frontend/app/components/management/README.md).
- [Almacenamiento de comprobantes de pago](tributek/backend/src/payment-evidence/README.md).
