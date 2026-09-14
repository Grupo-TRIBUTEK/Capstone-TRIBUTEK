import 'dotenv/config'; // carga las variables del archivo .env en process.env
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

Object.defineProperty(BigInt.prototype, 'toJSON', {
  value() {
    return this.toString();
  },
  configurable: true,
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
await bootstrap();
