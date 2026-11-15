import type { INestApplication } from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express'

export function configureHttpSecurity(app: INestApplication) {
  app.getHttpAdapter().getInstance().disable('x-powered-by')
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('X-Frame-Options', 'DENY')
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.setHeader('Cache-Control', 'no-store')
    next()
  })
}
