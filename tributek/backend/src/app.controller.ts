/**
 * Endpoint inicial del servidor. Delega la respuesta en AppService.
 */
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Consultar el saludo inicial. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
