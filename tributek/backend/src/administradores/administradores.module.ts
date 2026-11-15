import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { AuthModule } from '../auth/auth.module.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { AdministradoresController } from './administradores.controller.js'
import { CorreoModule } from '../correo/correo.module.js'
import { AdministradoresService } from './administradores.service.js'
@Module({ imports: [AuthModule, PrismaModule, CorreoModule, PassportModule.register({ defaultStrategy: 'jwt' })], controllers: [AdministradoresController], providers: [AdministradoresService] })
export class AdministradoresModule {}
