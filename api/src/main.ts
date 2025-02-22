import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { AppModule } from './app.module';
import { AppConfig } from './core/app.config';
import { createRedisAdapter, SocketIoAdapter } from './core/websockets';
import { createPostgresSchemas } from './core/typeorm';

async function bootstrap() {
  process.env.TZ = 'America/Sao_Paulo';
  initializeTransactionalContext();

  createPostgresSchemas();

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

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  app.useWebSocketAdapter(
    new SocketIoAdapter(app, {
      path: '/api/socket.io',
      transports: ['websocket'],
      cors: {
        origin: '*',
        credentials: true,
      },
      adapter: await createRedisAdapter({ url: config.REDIS_URL }),
    }),
  );

  if (process.env.NODE_ENV !== 'production') setupSwagger(app);

  app.enableShutdownHooks();
  await app.listen(config.API_PORT, '0.0.0.0');
}

function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Epicstory API')
    .setDescription('Main API for epicstory application')
    .setVersion('1.0')
    .addTag('release')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
}

bootstrap();
