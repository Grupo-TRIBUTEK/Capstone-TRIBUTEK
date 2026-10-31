# Integración de IA en el backend

El backend NestJS recibe las consultas autenticadas del frontend y las reenvía al servicio local de Ollama. Este documento resume la implementación y los pasos para ejecutarla.

## Componentes

La funcionalidad está en `backend/src/ia/`:

| Archivo | Responsabilidad |
|---|---|
| `ia.module.ts` | Registra el módulo, el servicio y las dependencias de autenticación. |
| `ia.controller.ts` | Expone la ruta `POST /ia/consultas` y valida la sesión y los datos recibidos. |
| `ia.service.ts` | Envía la consulta a Ollama y devuelve su respuesta. |
| `dto/consulta-ia.dto.ts` | Define y valida el formato de la consulta. |

El módulo importa `AuthModule` y registra `PassportModule` para que `JwtAuthGuard` pueda validar el token de sesión.

## Ruta y formato de la solicitud

Envía una solicitud `POST /ia/consultas` con un token JWT válido y un cuerpo JSON como este:

```json
{
  "consulta": "¿Dónde puedo revisar las obligaciones pendientes?",
  "contexto": "/admin/obligaciones"
}
```

`consulta` es obligatoria y admite entre 1 y 4000 caracteres. `contexto` es opcional y admite hasta 200 caracteres. El backend valida ambos campos antes de procesar la solicitud.

Una respuesta correcta tiene este formato:

```json
{
  "respuesta": "...",
  "modelo": "qwen3:4b-instruct"
}
```

El contenido de `respuesta` lo genera Ollama; no se preparan respuestas de ejemplo en el backend.

## Configurar Ollama

El servicio lee estas variables de entorno:

| Variable | Valor usado si no se define |
|---|---|
| `OLLAMA_URL` | `http://localhost:11434` |
| `OLLAMA_MODEL` | `qwen3:4b-instruct` |
| `OLLAMA_TIMEOUT_MS` | `60000` |

Define estas variables en el entorno del backend cuando necesites usar otra dirección, modelo o tiempo de espera. Ollama debe estar iniciado y tener descargado el modelo elegido.

## Activar el servicio de IA

Por ahora, la activación de Ollama y la carga inicial del modelo se hacen manualmente en el equipo que ejecuta TRIBUTEK. Si el asistente indica que no puede conectar con el servicio, sigue estos pasos en Windows:

1. Abre PowerShell y revisa si Ollama está disponible y si el modelo ya está instalado:

   ```powershell
   ollama --version
   ollama list
   ```

2. Si `qwen3:4b-instruct` no aparece en la lista, descárgalo:

   ```powershell
   ollama pull qwen3:4b-instruct
   ```

3. Inicia Ollama. Si la aplicación de Ollama no está ejecutándose en segundo plano, abre una terminal y déjala abierta mientras uses la IA:

   ```powershell
   ollama serve
   ```

   Si Ollama ya está iniciado como aplicación o servicio, no ejecutes este comando; continúa con el siguiente paso.

4. En otra ventana de PowerShell, carga y comprueba el modelo:

   ```powershell
   ollama run qwen3:4b-instruct
   ```

   Escribe una consulta breve y confirma que responda. Para cerrar esta sesión interactiva escribe `/bye`. Ollama seguirá disponible mientras su servicio esté activo; después vuelve a probar el asistente en TRIBUTEK.

Esta activación manual es una medida temporal para el entorno actual. Se espera automatizar el inicio del servicio y la disponibilidad del modelo para que no sea necesario realizar estos pasos manualmente.

## Ejecutar y comprobar

Desde la carpeta `backend`, inicia NestJS en modo desarrollo:

```powershell
npm run start:dev
```

Por defecto, el backend escucha en el puerto `3001`. Si Ollama no está disponible, se agota el tiempo de espera o devuelve una respuesta vacía, el backend informa el error correspondiente en vez de devolver una respuesta inventada.

Para probar el flujo completo, inicia también el frontend, inicia sesión en TRIBUTEK y envía una consulta desde el asistente. El frontend utiliza la ruta `/ia/consultas`, que Next.js redirige al backend.
