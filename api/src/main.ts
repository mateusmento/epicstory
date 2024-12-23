import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfig } from './core/app.config';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { createSchemas } from './core/typeorm';
import { SocketIoAdapter } from './core/websockets';
import { JwtService } from '@nestjs/jwt';

async function bootstrap() {
  process.env.TZ = 'America/Sao_Paulo';
  initializeTransactionalContext();

  createSchemas();

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

  const jwtService = app.get(JwtService);

  app.useWebSocketAdapter(
    new SocketIoAdapter(app, {
      cors: {
        origin: config.CORS_ORIGINS,
        credentials: true,
      },
      allowRequest: async (req, decide) => {
        try {
          const user = await jwtService.verifyAsync(
            req.headers.authorization.replace('Bearer ', ''),
          );
          (req as any).user = user;
          decide('', true);
        } catch (ex) {
          decide('Unauthorized', false);
        }
      },
      // adapter: await createRedisAdapter({ url: config.REDIS_URL }),
    }),
  );

  setupSwagger(app);

  app.enableShutdownHooks();
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
