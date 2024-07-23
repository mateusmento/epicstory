import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  setupSwagger(app);

  await app.listen(3000);
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
