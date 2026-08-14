import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { REFRESH_COOKIE_NAME } from './auth/auth-cookie.service';

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Maintenance Car API')
    .setDescription('API for vehicle maintenance management')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter only the accessToken returned by login.',
      },
      'access-token',
    )
    .addCookieAuth(
      REFRESH_COOKIE_NAME,
      {
        type: 'apiKey',
        in: 'cookie',
        description:
          'HttpOnly rotating refresh cookie set by register/login and sent automatically by browsers. It is host-only, SameSite=Strict, and limited to /api/v1/auth.',
      },
      'refresh-token',
    )
    .build();

  return SwaggerModule.createDocument(app, config);
}

export function configureOpenApi(app: INestApplication): void {
  SwaggerModule.setup('docs', app, createOpenApiDocument(app), {
    jsonDocumentUrl: 'docs/openapi.json',
    customSiteTitle: 'Maintenance Car API — Swagger',
    swaggerOptions: {
      displayRequestDuration: true,
      filter: true,
      persistAuthorization: true,
      tryItOutEnabled: true,
    },
  });
}
