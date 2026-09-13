import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { JwtModule } from '@nestjs/jwt'; // hacemos npm install @nestjs/jwt desde el backend (docuemtnarlo)
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy.js';
import { RolesGuard } from './roles.guard.js'; // roles
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
  providers: [AuthService, JwtStrategy,RolesGuard],

  /*
  Con JwtStrategy, el flujo de autenticación con JWT es el siguiente:
1. El usuario inicia sesión y recibe un JWT.
2. El cliente envía el JWT en la cabecera Authorization: Bearer <token> en cada solicitud protegida.
3. JwtStrategy extrae el JWT de la cabecera, verifica su firma con JWT_SECRET y comprueba su expiración.
4. Si el token es válido, JwtStrategy extrae los datos del usuario y los adjunta a la solicitud.
5. El controlador puede acceder a los datos del usuario desde la solicitud para autorizar acciones específicas.

  */
  exports: [AuthService],
})
export class AuthModule {}