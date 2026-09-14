import { Body, Controller, Get, Param, Post, Query, Req, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { DocumentosService } from './documentos.service.js';

@Controller('documentos')
@UseGuards(JwtAuthGuard)
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  @Get()
  listar(@Query() filters: { buscar?: string; clienteId?: string; periodo?: string; tipo?: string; estado?: string }) {
    return this.documentosService.listar(filters);
  }

  @Get('tipos-sugeridos')
  tiposSugeridos() {
    return this.documentosService.tiposSugeridos();
  }

  @Post()
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 10 * 1024 * 1024 } }))
  cargar(@UploadedFile() file: any, @Body() data: any, @Req() request: any) {
    return this.documentosService.cargar(file, data, request.user.id);
  }

  @Get(':id/descargar')
  async descargar(@Param('id') id: string) {
    const { documento, stream } = await this.documentosService.descargar(id);
    return new StreamableFile(stream, {
      type: documento.mimeType,
      disposition: `attachment; filename="${encodeURIComponent(documento.nombreArchivo)}"`,
    });
  }
}
