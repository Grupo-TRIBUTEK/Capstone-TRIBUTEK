//4: lógica del login.
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt'; // Nueva importacion de JWT para tockens

/**
 * Servicio encargado de gestionar la lógica de autenticación de los usuarios.
 *
 * Su función es recibir los datos enviados desde el controlador de autenticación,
 * consultar el usuario en la base de datos mediante Prisma y validar que la cuenta
 * exista y se encuentre activa.
 *
 * En las siguientes etapas también será responsable de:
 * - Verificar la contraseña mediante Argon2.
 * - Generar el token de autenticación mediante JWT.
 */



@Injectable()
export class AuthService {
constructor(
  private readonly prisma: PrismaService,
  private readonly jwtService: JwtService, // Agregamos JWTService para poder generar tokens de autenticación.
) {}
  /**
   * Procesa la solicitud de inicio de sesión.
   *
   * Actualmente:
   * 1. Recibe el nombre de usuario desde el LoginDto.
   * 2. Busca el usuario en PostgreSQL mediante Prisma 8.
   * 3. Comprueba que el usuario exista.
   * 4. comprueba que la cuenta esté activa.
   * 5. Devuelve los datos básicos del usuario.
   */
  async login(loginDto: LoginDto) {
  // Se obtiene el nombre de usuario enviado desde el formulario de login.
  const nombreUsuario = loginDto.nombreUsuario as any;

  // Se busca el usuario en la base de datos.
  const usuario = await this.prisma.db.orm.public.Usuario
    .where({
      nombreUsuario,
    })
    .first();

  // Si no existe el usuario, se rechaza la autenticación.
  if (!usuario) {
    throw new UnauthorizedException('Usuario o contraseña incorrectos');
  }

  // Se verifica que la cuenta esté activa.
  if (!usuario.activo) {
    throw new UnauthorizedException('Usuario inactivo');
  }

  // Se compara la contraseña ingresada con el hash almacenado.
  const passwordValida = await argon2.verify(
    usuario.passwordHash,
    loginDto.password,
  );

  // Si la contraseña no coincide, se rechaza la autenticación.
  if (!passwordValida) {
    throw new UnauthorizedException('Usuario o contraseña incorrectos');
  }

  // Por ahora se devuelve información básica del usuario.
  // Posteriormente aquí se generará el token JWT.
const payload = {
  // El sub representa el identificador del usuario dentro del JWT
  sub: usuario.id.toString(),
  nombreUsuario: usuario.nombreUsuario,
  rolId: usuario.rolId.toString(),
};

const accessToken = await this.jwtService.signAsync(payload);

return {
    // Error corregido: Eñ id se devuelven como strign y no como BigInit por temas de error con JSON

  mensaje: 'Inicio de sesión exitoso',
  access_token: accessToken,
  usuario: {
    id: usuario.id.toString(),
    nombreUsuario: usuario.nombreUsuario,
    rolId: usuario.rolId.toString(),
  },
};
}
}

// auth.service.ts contiene la lógica de negocio de la autenticación.
// El controlador (auth.controller.ts) recibe la petición:


