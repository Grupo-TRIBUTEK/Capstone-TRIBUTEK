import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// El @Global() nos permite utilizar PrismaService desde AuthService,
//  UsuariosService, etc.,
//  sin tener que importar PrismaModule en todos los módulos.

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}