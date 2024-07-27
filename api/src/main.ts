import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfig } from './core/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('/api');

  const config = app.get(AppConfig);

  app.enableCors({
    origin: config.CORS_ORIGINS,
    credentials: true,
  });

  app.use(cookieParser(config.COOKIE_SECRET));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableCircularCheck: true,
        enableImplicitConversion: true,
      },
    }),
  );

  setupSwagger(app);

  await app.listen(config.API_PORT);
}

function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Epicstory API')
    .setDescription('Main API for epicstory application')
    .setVersion('1.0')
    .addTag('release')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
}

bootstrap();
