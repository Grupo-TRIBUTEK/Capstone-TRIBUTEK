import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { ActivarCuentaDto } from './dto/activar-cuenta.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { Roles } from './decorators/roles.decorator.js';
import { RolesGuard } from './roles.guard.js';
import { Setup2faDto } from './dto/setup-2fa.dto.js';
import { Confirm2faDto } from './dto/confirm-2fa.dto.js';
import { Verify2faDto } from './dto/verify-2fa.dto.js';
import { Disable2faDto } from './dto/disable-2fa.dto.js';

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

  @UseGuards(JwtAuthGuard)
  @Get('2fa/status')
  twoFactorStatus(@Req() req: any) {
    return this.authService.get2faStatus(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  setup2fa(@Req() req: any, @Body() dto: Setup2faDto) {
    return this.authService.setup2fa(req.user.id, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/confirm')
  confirm2fa(@Req() req: any, @Body() dto: Confirm2faDto) {
    return this.authService.confirm2fa(req.user.id, dto.code);
  }

  @Post('2fa/verify')
  verify2fa(@Body() dto: Verify2faDto) {
    return this.authService.verify2fa(dto.challengeToken, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  disable2fa(@Req() req: any, @Body() dto: Disable2faDto) {
    return this.authService.disable2fa(req.user.id, dto.password, dto.code);
  }
}
