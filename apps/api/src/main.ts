import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { UPLOAD_ROOT } from './modules/uploads/upload-storage';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Matches the production reverse proxy's path-based routing (nginx
  // forwards the full, unstripped request path to this process — see the
  // deployment notes in README.md) — every @Controller() route now lives
  // under /api/v1/..., e.g. POST /api/v1/auth/login. Doesn't affect
  // useStaticAssets or Swagger below — those are mounted directly on the
  // underlying Express app, outside Nest's controller-routing layer that
  // this prefix applies to.
  app.setGlobalPrefix('api/v1');

  app.use(cookieParser());
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true, credentials: true });
  // Served directly by Express, outside Nest's guard pipeline — an
  // uploaded file's URL is only as private as its UUID filename is
  // unguessable (see upload-storage.ts). Fine for local-disk MVP storage;
  // revisit if a stronger access boundary is ever needed per file.
  app.useStaticAssets(UPLOAD_ROOT, { prefix: '/uploads' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('AutoNexa API')
    .setDescription('Automotive Workshop Management SaaS — REST API')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`AutoNexa API running on :${port} — docs at /api/docs`);
}
bootstrap();
