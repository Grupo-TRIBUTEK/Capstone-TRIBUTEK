import { Module } from '@nestjs/common'
import { EmailVerificationService } from './email-verification.service.js'
@Module({ providers: [EmailVerificationService], exports: [EmailVerificationService] })
export class CorreoModule {}
