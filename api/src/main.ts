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
import { GlobalExceptionFilter } from './core/global-exception.filter';
import { DataSource } from 'typeorm';

async function bootstrap() {
  process.env.TZ = 'America/Sao_Paulo';
  initializeTransactionalContext();

  // Add global error handlers to prevent crashes
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit the process, let the application handle it
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, let the application handle it
  });

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

  // Add global exception filter to handle unhandled errors
  app.useGlobalFilters(new GlobalExceptionFilter());

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

  (async () => {
    await createPostgresSchemas();
    const dataSource = app.get(DataSource);
    console.log('Running migrations...');
    await dataSource.runMigrations();
    console.log('Migrations ran successfully');
  })();

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
