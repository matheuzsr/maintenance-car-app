import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { createOpenApiDocument } from '../src/openapi';

async function exportOpenApi(): Promise<void> {
  const outputArgument = process.argv[2];

  if (!outputArgument) {
    throw new Error('Provide the output path for the OpenAPI document.');
  }

  const outputPath = resolve(process.cwd(), outputArgument);
  const app = await NestFactory.create(AppModule, {
    abortOnError: false,
    logger: ['error'],
  });

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.setGlobalPrefix('api');

  const document = createOpenApiDocument(app);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  await app.close();
}

void exportOpenApi().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
