//4: lógica del login.
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import * as argon2 from 'argon2';
import 'temporal-polyfill/global';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
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

  async activarCuenta(token: string, nombreUsuario: string | undefined, email: string | undefined, password: string, confirmarPassword: string) {
    let payload: { sub?: string; purpose?: string };
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('El enlace es inv?lido o expir?.');
    }

    const esInvitacion = payload.purpose === 'set-client-password';
    const esRestablecimiento = payload.purpose === 'reset-client-password';
    if ((!esInvitacion && !esRestablecimiento) || !payload.sub) {
      throw new UnauthorizedException('El enlace no es v?lido.');
    }
    if (!password || password.length < 10) {
      throw new BadRequestException('La contrase?a debe tener al menos 10 caracteres.');
    }
    if (password !== confirmarPassword) {
      throw new BadRequestException('Las contrase?as no coinciden.');
    }

    const identificador = nombreUsuario?.trim();
    const usuarioNombre = identificador?.includes('@')
      ? identificador.toLowerCase()
      : identificador;
    if (esInvitacion && (!usuarioNombre || usuarioNombre.length > 80)) {
      throw new BadRequestException('Ingresa un nombre de usuario v?lido de hasta 80 caracteres.');
    }

    const correo = email?.trim().toLowerCase();
    if (esInvitacion && (!correo || correo.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))) {
      throw new BadRequestException('Ingresa un correo electrónico válido de hasta 150 caracteres.');
    }

    const usuario = await this.prisma.db.orm.public.Usuario
      .where({ id: BigInt(payload.sub) })
      .first();
    if (!usuario || (esInvitacion && usuario.activo) || (esRestablecimiento && !usuario.activo)) {
      throw new UnauthorizedException('La cuenta no existe o el enlace ya no es v?lido.');
    }

    const clientesAsociados = await this.prisma.db.orm.public.UsuarioCliente
      .where({ usuarioId: usuario.id })
      .all();
    if (!clientesAsociados.length) {
      throw new UnauthorizedException('El acceso al portal fue revocado.');
    }

    if (usuarioNombre) {
      const usuarioExistente = await this.prisma.db.orm.public.Usuario
        .where({ nombreUsuario: usuarioNombre as Varchar<80> })
        .first();
      if (usuarioExistente && usuarioExistente.id !== usuario.id) {
        throw new BadRequestException('Ese nombre de usuario ya est? en uso.');
      }
    }
    if (correo) {
      const usuarioConCorreo = await this.prisma.db.orm.public.Usuario
        .where({ email: correo as Varchar<150> })
        .first();
      if (usuarioConCorreo && usuarioConCorreo.id !== usuario.id) {
        throw new BadRequestException('Ese correo electrónico ya está asociado a otra cuenta.');
      }
    }

    await this.prisma.db.orm.public.Usuario.where({ id: usuario.id }).update({
      ...(usuarioNombre ? { nombreUsuario: usuarioNombre as Varchar<80> } : {}),
      ...(esInvitacion && correo ? { email: correo as Varchar<150> } : {}),
      passwordHash: (await argon2.hash(password)) as Varchar<255>,
      activo: true,
      actualizadoEn: Temporal.Now.instant(),
    });

    return {
      mensaje: esInvitacion
        ? 'Cuenta activada. Ya puedes iniciar sesi?n.'
        : 'Contrase?a restablecida. Ya puedes iniciar sesi?n.',
    };
  }

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
  const identificador = loginDto.nombreUsuario?.trim();
  const nombreUsuario = identificador?.includes('@')
    ? identificador.toLowerCase()
    : identificador;
  let usuario = nombreUsuario
    ? await this.prisma.db.orm.public.Usuario
        .where({ nombreUsuario: nombreUsuario as Varchar<80> })
        .first()
    : null;
  if (!usuario && nombreUsuario?.includes('@')) {
    usuario = await this.prisma.db.orm.public.Usuario
      .where({ email: nombreUsuario as Varchar<150> })
      .first();
  }

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

  const rol = await this.prisma.db.orm.public.Rol
    .where({ id: usuario.rolId })
    .first();
  const rolNombre = String(rol?.nombre ?? '').toUpperCase();

  // Por ahora se devuelve información básica del usuario.
  // Posteriormente aquí se generará el token JWT.
const payload = {
  // El sub representa el identificador del usuario dentro del JWT
  sub: usuario.id.toString(),
  nombreUsuario: usuario.nombreUsuario,
  rolId: usuario.rolId.toString(),
  rolNombre,
};

const accessToken = await this.jwtService.signAsync(payload);

return {
    // Error corregido: En id se devuelven como strign y no como BigInit por temas de error con JSON

  mensaje: 'Inicio de sesión exitoso',
  access_token: accessToken,
  usuario: {
    id: usuario.id.toString(),
    nombreUsuario: usuario.nombreUsuario,
    rolId: usuario.rolId.toString(),
    rolNombre,
  },
};
}
}

// auth.service.ts contiene la lógica de negocio de la autenticación.
// El controlador (auth.controller.ts) recibe la petición:


