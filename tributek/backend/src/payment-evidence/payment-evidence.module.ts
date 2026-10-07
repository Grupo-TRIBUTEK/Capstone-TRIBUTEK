import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  Post,
  Put,
  Req,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from '../auth/auth.module.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import {
  PaymentEvidenceService,
  type Upload,
} from './payment-evidence.service.js';
type Request = { user: { id: string; rolId: string; rolNombre?: string } };
@Controller('payment-evidence/:client')
@UseGuards(JwtAuthGuard)
class PaymentEvidenceController {
  constructor(private readonly service: PaymentEvidenceService) {}
  @Get() list(@Param('client') c: string, @Req() r: Request) {
    return this.service.list(c, r.user);
  }
  @Delete(':id') archive(
    @Param('client') c: string,
    @Param('id') id: string,
    @Req() r: Request,
  ) {
    return this.service.archive(c, id, r.user);
  }
  @Get(':id') get(
    @Param('client') c: string,
    @Param('id') id: string,
    @Req() r: Request,
  ) {
    return this.service.get(c, id, r.user);
  }
  @Put(':id') register(
    @Param('client') c: string,
    @Param('id') id: string,
    @Req() r: Request,
    @Body() b: { date?: string; amount?: number },
  ) {
    return this.service.register(c, id, r.user, b);
  }
  @Post(':id/files')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: { fileSize: 8 * 1024 * 1024, files: 10, fields: 4 },
    }),
  )
  upload(
    @Param('client') c: string,
    @Param('id') id: string,
    @Req() r: Request,
    @UploadedFiles() f: Upload[],
    @Body() b: Record<string, string>,
  ) {
    return this.service.upload(c, id, r.user, f, b);
  }
  @Get(':id/files/:file') async download(
    @Param('client') c: string,
    @Param('id') id: string,
    @Param('file') f: string,
    @Req() r: Request,
  ) {
    const { file, stream } = await this.service.download(c, id, f, r.user);
    return new StreamableFile(stream, {
      type: file.mime,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    });
  }
  @Delete(':id/files/:file') remove(
    @Param('client') c: string,
    @Param('id') id: string,
    @Param('file') f: string,
    @Req() r: Request,
  ) {
    return this.service.remove(c, id, f, r.user);
  }
}
@Module({
  imports: [PrismaModule, AuthModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [PaymentEvidenceController],
  providers: [PaymentEvidenceService],
})
export class PaymentEvidenceModule {}
