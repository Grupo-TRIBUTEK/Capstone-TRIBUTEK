/**
 * Lógica de consultas del asistente a Ollama. Aquí se coordinan validaciones y operaciones del módulo.
 */
import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConsultaIaDto } from './dto/consulta-ia.dto.js';

type OllamaResponse = { response?: string; model?: string; error?: string };

const SYSTEM_PROMPT = `Eres guía de TRIBUTEK. Responde en español, breve y directamente.
No repitas la consulta ni muestres razonamiento interno.
No accedes a registros ni ejecutas acciones. Si piden navegar, aclara que no puedes cambiar la vista e indica la ruta o el menú.
El contexto solo identifica la sección actual. No inventes rutas ni funciones.`;

@Injectable()
export class IaService {
  /** Envía la pregunta y contexto de navegación a Ollama. Traduce fallos a errores HTTP y libera el temporizador. No consulta registros ni ejecuta acciones del usuario. */
  async consultar({ consulta, contexto }: ConsultaIaDto) {
    const baseUrl = (process.env['OLLAMA_URL'] ?? 'http://localhost:11434').replace(
      /\/$/,
      '',
    );
    const model = process.env['OLLAMA_MODEL'] ?? 'qwen3:4b-instruct';
    const timeoutMs = Number(process.env['OLLAMA_TIMEOUT_MS'] ?? 60_000);
    const prompt = contexto
      ? `Contexto de navegación: ${contexto}\n\nConsulta del usuario: ${consulta}`
      : consulta;
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, system: SYSTEM_PROMPT, prompt, stream: false }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as OllamaResponse | null;
        if (response.status === 404 && detail?.error?.includes('not found')) {
          throw new BadGatewayException(
            `Falta el modelo ${model}. Ejecuta: ollama pull ${model}`,
          );
        }
        throw new BadGatewayException('El servicio de IA devolvió un error.');
      }

      const result = (await response.json()) as OllamaResponse;
      const respuesta = result.response
        ?.replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/^[\s\S]*?<\/think>/i, '')
        .trim();

      if (!respuesta) {
        throw new BadGatewayException('El servicio de IA devolvió una respuesta vacía.');
      }

      return { respuesta, modelo: result.model ?? model };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GatewayTimeoutException(
          'El servicio de IA excedió el tiempo de espera.',
        );
      }
      throw new ServiceUnavailableException(
        'No fue posible conectar con el servicio de IA.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
