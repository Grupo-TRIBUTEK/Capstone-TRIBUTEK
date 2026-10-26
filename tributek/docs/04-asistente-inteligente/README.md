# Cambios aplicados al asistente IA

Este documento resume el ajuste realizado para que el asistente responda de forma breve y evitar los tiempos de espera observados.

## Resumen

| Área | Antes | Ahora | Motivo |
|---|---|---|---|
| Modelo Ollama | `qwen3:4b` (`359d7dd4bcda`, variante de razonamiento) | `qwen3:4b-instruct` (`0edcdef34593`) | La variante anterior dedicaba tiempo a generar razonamiento antes de responder. |
| Tamaño del modelo | Aproximadamente 2,5 GB | Aproximadamente 2,5 GB | Se cambió a otra variante de tamaño similar; no se entrenó ni modificó el modelo. |
| Modelo predeterminado del backend | `qwen3:4b` | `qwen3:4b-instruct` | El servicio usa este modelo si no se define `OLLAMA_MODEL`. |
| Instrucciones | Sin instrucciones para el asistente | Responder en español, ser breve, no repetir la pregunta ni afirmar que puede leer datos o ejecutar acciones | Da respuestas más adecuadas para una guía del sistema. |
| Respuesta recibida | Se podía mostrar texto entre etiquetas `<think>` | El servicio elimina los bloques `<think>` antes de devolver el texto | Evita mostrar razonamiento si el modelo lo incluye. |
| Tiempo de espera | NestJS: 60 s; proxy de Next: 30 s por defecto | NestJS: 60 s; proxy de Next: 70 s | El proxy puede esperar a que NestJS devuelva su respuesta o su error de tiempo de espera. |

Las etiquetas y huellas de los modelos se pueden consultar en el [registro de Qwen3 de Ollama](https://ollama.com/library/qwen3/tags).

## Instalación del modelo

El modelo instruct ya se descargó en el equipo donde se hizo este cambio. En otro equipo, instálalo con:

```powershell
ollama pull qwen3:4b-instruct
```

Si `OLLAMA_MODEL` está definido en el entorno del backend, ese valor reemplaza el modelo predeterminado.

## Comprobación realizada

Se comprobó que Ollama listara `qwen3:4b-instruct` y se envió una consulta corta directamente a su API. Respondió «Hola 😊» en aproximadamente 8 segundos. Es una comprobación puntual, no una medición de rendimiento ni una prueba completa desde el panel.

## Cambios que no se hicieron

- No se modificaron ni entrenaron los pesos del modelo.
- No se añadió memoria de conversación; cada consulta sigue enviándose por separado.
- El asistente no consulta la base de datos ni ejecuta acciones en TRIBUTEK.
