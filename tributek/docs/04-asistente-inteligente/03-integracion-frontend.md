# Asistente IA en el frontend

El asistente está disponible en las áreas de Administradora y Cliente. Ambos portales utilizan el mismo componente: `frontend/app/components/IaAssistant.tsx`.

## Qué hace el chat

- Muestra un botón flotante para abrir o cerrar la ventana.
- Permite enviar consultas y ver las respuestas que devuelve el backend.
- Muestra cuándo está esperando una respuesta y permite recuperarse de errores de conexión o de respuesta.
- Envía la ruta actual como contexto de navegación.
- Conserva los mensajes solo en memoria mientras la página está abierta.

Las solicitudes se envían a `POST /ia/consultas` con `authenticatedFetch()`. El navegador no se conecta directamente a Ollama. El tema y los colores del chat usan las variables de interfaz de TRIBUTEK, incluidos los temas claro y oscuro.

## Dónde aparece

- El layout de Administradora incorpora el chat después de validar el acceso. Mientras se valida la sesión, el asistente no se muestra.
- El layout de Cliente reutiliza el mismo componente. El botón aparece cuando hay un token de sesión, así que no se muestra en la pantalla de login ni en páginas públicas.

La posición flotante deja libre la navegación y el contenido de la página. No se modificó la navegación de ninguno de los portales.

## Probarlo

1. Inicia Ollama con el modelo configurado y levanta el backend y el frontend.
2. Inicia sesión como Administradora o como Cliente.
3. Abre el botón **Asistente IA**, escribe una consulta y pulsa **Enviar**.
4. Comprueba que se muestre la respuesta del modelo. Si el backend u Ollama no responden, el chat presenta un mensaje de error y sigue disponible para otro intento.

Para conocer la ruta, el formato de solicitud y la configuración de Ollama, consulta [Integración de IA en el backend](02-Integracion-ia-backend.md).
