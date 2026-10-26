import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConsultaIaDto } from './dto/consulta-ia.dto.js';

type OllamaResponse = { response?: string; model?: string; error?: string };

@Injectable()
export class IaService {
  async consultar({ consulta, contexto }: ConsultaIaDto) {
    const baseUrl = (process.env['OLLAMA_URL'] ?? 'http://localhost:11434').replace(/\/$/, '');
    const model = process.env['OLLAMA_MODEL'] ?? 'qwen3:4b';
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
        body: JSON.stringify({ model, prompt, stream: false }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new BadGatewayException('El servicio de IA devolvió un error.');
      }

      const result = (await response.json()) as OllamaResponse;
      if (!result.response?.trim()) {
        throw new BadGatewayException('El servicio de IA devolvió una respuesta vacía.');
      }

      return { respuesta: result.response.trim(), modelo: result.model ?? model };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GatewayTimeoutException('El servicio de IA excedió el tiempo de espera.');
      }
      throw new ServiceUnavailableException('No fue posible conectar con el servicio de IA.');
    } finally {
      clearTimeout(timeout);
    }
  }
}
