import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateAsignacionServicioDto } from './dto/create-asignacion-servicio.dto.js';
import { CreateServicioDto } from './dto/create-servicio.dto.js';
import { ServiciosService } from './servicios.service.js';

@Controller('servicios')
@UseGuards(JwtAuthGuard)
export class ServiciosController {
  constructor(private readonly serviciosService: ServiciosService) {}

  @Get()
  obtenerServicios(@Query('buscar') buscar?: string) {
    return this.serviciosService.obtenerServicios(buscar);
  }

  @Post()
  crearServicio(@Body() datos: CreateServicioDto) {
    return this.serviciosService.crearServicio(datos);
  }

  @Get('asignaciones')
  obtenerAsignaciones() {
    return this.serviciosService.obtenerAsignaciones();
  }

  @Post('asignaciones')
  crearAsignacion(@Body() datos: CreateAsignacionServicioDto) {
    return this.serviciosService.crearAsignacion(datos);
  }

  @Patch('asignaciones/:id')
  actualizarAsignacion(
    @Param('id') id: string,
    @Body() datos: CreateAsignacionServicioDto,
  ) {
    return this.serviciosService.actualizarAsignacion(id, datos);
  }

  @Patch(':id')
  actualizarServicio(@Param('id') id: string, @Body() datos: CreateServicioDto) {
    return this.serviciosService.actualizarServicio(id, datos);
  }
}
