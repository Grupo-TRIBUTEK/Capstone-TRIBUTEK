/**
 * Punto de entrada del servidor: configura Temporal y serialización de BigInt e inicia Nest.
 */
import 'temporal-polyfill/global';
import 'dotenv/config'; // carga las variables del archivo .env en process.env
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

Object.defineProperty(BigInt.prototype, 'toJSON', {
  /** Serializa BigInt como texto porque JSON no admite ese tipo directamente. */
  value() {
    return this.toString();
  },
  configurable: true,
});

/** Inicia Nest en el puerto configurado o en 3001 si PORT no está definido. */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
await bootstrap();
