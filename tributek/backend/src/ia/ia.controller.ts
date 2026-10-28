/**
 * Rutas HTTP de consultas del asistente a Ollama. Los decoradores indican método, URL y permisos; el controlador entrega la operación al servicio.
 */
import {
  Body,
  Controller,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { IaService } from './ia.service.js';
import { ConsultaIaDto } from './dto/consulta-ia.dto.js';

@Controller('ia')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class IaController {
  constructor(private readonly iaService: IaService) {}

  /** Enviar la consulta al asistente. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Post('consultas')
  consultar(@Body() consulta: ConsultaIaDto) {
    return this.iaService.consultar(consulta);
  }
}
