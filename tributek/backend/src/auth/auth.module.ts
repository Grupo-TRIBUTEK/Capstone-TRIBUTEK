import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { JwtModule } from '@nestjs/jwt'; // hacemos npm install @nestjs/jwt desde el backend (docuemtnarlo)
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy.js';
import { RolesGuard } from './roles.guard.js'; // roles
import { JwtAuthGuard } from './jwt-auth.guard.js';
@Module({
  imports: [
    //Agregamos el módulo de Prisma para poder 
    // inyectar el servicio de Prisma en AuthService.
    PrismaModule,
    // Agregamos el módulo de JWT para poder generar 
    // tokens de autenticación. :)
    JwtModule.register({
      // lobal: true permite utilizar JwtService desde otros
      //  módulos sin tener que importar JwtModule nuevamente.
      global: true,
      secret: process.env['JWT_SECRET'],
      signOptions: {
        expiresIn: '1h',
      },
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
