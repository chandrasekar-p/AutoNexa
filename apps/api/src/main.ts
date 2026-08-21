import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { UPLOAD_ROOT } from './modules/uploads/upload-storage';
import { API_PREFIX } from './common/api-prefix';

async function bootstrap() {
  // rawBody: true attaches the untouched request bytes as req.rawBody
  // alongside the normal parsed req.body, for every JSON/urlencoded
  // request — needed by exactly one route so far
  // (POST /payments/webhooks/razorpay), which must verify Razorpay's HMAC
  // signature against the exact bytes sent, not a re-serialized copy of
  // the parsed body (JSON.stringify isn't guaranteed byte-identical to
  // what was received — different key order, whitespace — which would
  // make a genuine signature fail verification). See
  // razorpay-webhook.controller.ts and verify-razorpay-signature.ts.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  // Matches the production reverse proxy's path-based routing (nginx
  // forwards the full, unstripped request path to this process — see the
  // deployment notes in README.md) — every @Controller() route now lives
  // under /api/v1/..., e.g. POST /api/v1/auth/login.
  app.setGlobalPrefix(API_PREFIX);

  app.use(cookieParser());
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true, credentials: true });
  // useStaticAssets is mounted directly on the underlying Express app, so
  // setGlobalPrefix above does NOT apply to it automatically — it must be
  // included here explicitly under the same API_PREFIX, or the frontend's
  // resolveUploadUrl() (which resolves every relative path against
  // NEXT_PUBLIC_API_URL, itself already /api/v1-suffixed) 404s on every
  // uploaded file. Served directly by Express, outside Nest's guard
  // pipeline — an uploaded file's URL is only as private as its UUID
  // filename is unguessable (see upload-storage.ts). Fine for local-disk
  // MVP storage; revisit if a stronger access boundary is ever needed.
  app.useStaticAssets(UPLOAD_ROOT, { prefix: `/${API_PREFIX}/uploads` });

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
