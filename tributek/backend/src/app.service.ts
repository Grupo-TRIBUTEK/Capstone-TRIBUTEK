/**
 * Servicio del endpoint inicial; conserva el saludo de la aplicación base.
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /** Devuelve el saludo fijo del endpoint inicial; no consulta la base de datos. */
  getHello(): string {
    return 'Hello World!';
  }
}
