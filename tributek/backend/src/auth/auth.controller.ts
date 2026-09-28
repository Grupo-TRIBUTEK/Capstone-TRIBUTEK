import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';

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

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

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

  @UseGuards(JwtAuthGuard)
  @Get('perfil')
  perfil() {
    return {
      mensaje: 'Acceso autorizado',
    };
  }

  @Roles('ADMIN', 1)
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('admin')
admin() {
  return {
    mensaje: 'Acceso autorizado para ADMIN',
  };
}
}
