import { Body, Controller, Get, Param, Post, Query, Req, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CargarDocumentoDto } from './dto/cargar-documento.dto.js';
import { DocumentosService } from './documentos.service.js';

@Controller('documentos')
@UseGuards(JwtAuthGuard)
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  listar(@Query() filters: { buscar?: string; clienteId?: string; periodo?: string; tipo?: string; estado?: string }) {
    return this.documentosService.listar(filters);
  }

  @Get('tipos-sugeridos')
  tiposSugeridos() {
    return this.documentosService.tiposSugeridos();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 10 * 1024 * 1024 } }))
  // QUÉ HACE: recibe el archivo + los datos y los pasa al servicio.
  // ERROR INICIAL: `@Body() data: any` aceptaba cualquier cosa (números,
  //   listas, campos fantasma) sin que el compilador avisara.
  // SOLUCIÓN: tipar con `CargarDocumentoDto`, los 5 campos que `cargar()` usa.
  // EVITAR: si se agrega un campo al formulario, agregarlo primero al DTO.
  cargar(@UploadedFile() file: any, @Body() data: CargarDocumentoDto, @Req() request: any) {
    return this.documentosService.cargar(file, data, request.user.id);
  }

  @Get(':id/descargar')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 1)
  async descargar(@Param('id') id: string) {
    const { documento, stream } = await this.documentosService.descargar(id);
    return new StreamableFile(stream, {
      type: documento.mimeType,
      disposition: `attachment; filename="${encodeURIComponent(documento.nombreArchivo)}"`,
    });
  }
}
