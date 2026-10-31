/**
 * Rutas HTTP de catálogo de servicios y asignaciones a clientes. Los decoradores indican método, URL y permisos; el controlador entrega la operación al servicio.
 */
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

  /** Consultar el catálogo de servicios. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Get()
  obtenerServicios(@Query('buscar') buscar?: string) {
    return this.serviciosService.obtenerServicios(buscar);
  }

  /** Crear un servicio. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Post()
  crearServicio(@Body() datos: CreateServicioDto) {
    return this.serviciosService.crearServicio(datos);
  }

  /** Consultar asignaciones de servicios. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Get('asignaciones')
  obtenerAsignaciones() {
    return this.serviciosService.obtenerAsignaciones();
  }

  /** Asignar un servicio. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Post('asignaciones')
  crearAsignacion(@Body() datos: CreateAsignacionServicioDto) {
    return this.serviciosService.crearAsignacion(datos);
  }

  /** Modificar una asignación. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Patch('asignaciones/:id')
  actualizarAsignacion(
    @Param('id') id: string,
    @Body() datos: CreateAsignacionServicioDto,
  ) {
    return this.serviciosService.actualizarAsignacion(id, datos);
  }

  /** Finalizar una asignación. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Patch('asignaciones/:id/finalizar')
  finalizarAsignacion(@Param('id') id: string) {
    return this.serviciosService.finalizarAsignacion(id);
  }

  /** Modificar un servicio. La ruta delega las reglas de negocio al servicio; los guards se ejecutan antes del método. */
  @Patch(':id')
  actualizarServicio(@Param('id') id: string, @Body() datos: CreateServicioDto) {
    return this.serviciosService.actualizarServicio(id, datos);
  }
}
