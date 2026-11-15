import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js'
import { AdministradoresService } from './administradores.service.js'

type SessionRequest = { user: { id: string } }
@Controller('administradores')
@UseGuards(JwtAuthGuard)
export class AdministradoresController {
  constructor(private readonly service: AdministradoresService) {}
  @Get('permisos')
  async permisos(@Req() req: SessionRequest) {
    return { puedeGestionar: await this.service.puedeAdministrar(req.user.id) }
  }
  @Get()
  listar(@Req() req: SessionRequest) { return this.service.listar(req.user.id) }
  @Post(':id/correo/solicitar')
  solicitarCambioCorreo(@Req() req: SessionRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.solicitarCambioCorreo(req.user.id, id, body) }
  @Patch(':id/correo')
  actualizarCorreo(@Req() req: SessionRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.actualizarCorreo(req.user.id, id, body) }
  @Post()
  crear(@Req() req: SessionRequest, @Body() body: unknown) { return this.service.crear(req.user.id, body) }
}
