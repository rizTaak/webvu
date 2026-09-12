import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /**
   * Credentialed CORS for the dashboard and admin surfaces.
   *
   * `origin: true` reflects the request origin, which is only safe because
   * these are host-only cookies on first-party hosts — a user website on
   * `<slug>.webvu.localhost` holds no cookie to send, so reflecting its
   * origin grants it nothing. SPEC.md § Domains & Session Model.
   */
  app.enableCors({ origin: true, credentials: true });

  // Session tokens travel as HttpOnly cookies, so the guards need them parsed.
  app.use(cookieParser());

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('WebVu API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}
void bootstrap();
