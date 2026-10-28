/**
 * Rutas HTTP de sesión, credenciales y permisos de acceso. Los decoradores indican método, URL y permisos; el controlador entrega la operación al servicio.
 */
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { ActivarCuentaDto } from './dto/activar-cuenta.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
// roles
import { Roles } from './decorators/roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Autenticar credenciales. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /** Activar o restablecer una cuenta. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Post('activar-cuenta')
  activarCuenta(@Body() dto: ActivarCuentaDto) {
    return this.authService.activarCuenta(
      dto.token,
      dto.nombreUsuario,
      dto.email,
      dto.password,
      dto.confirmarPassword,
    );
  }

  /** Confirmar que la sesión pasó el guard de autenticación. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @UseGuards(JwtAuthGuard)
  @Get('perfil')
  perfil() {
    return {
      mensaje: 'Acceso autorizado',
    };
  }

  /** Confirmar que la sesión pasó los guards de autenticación y rol administrativo. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Roles('ADMIN', 1)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin')
  admin() {
    return {
      mensaje: 'Acceso autorizado para ADMIN',
    };
  }
}
