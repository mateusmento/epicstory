import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class AppConfig {
  @IsNumber()
  @Transform(({ value }) => +value)
  API_PORT: number = process.env.NODE_ENV === 'production' ? 80 : 3000;

  @IsNotEmpty()
  @Transform(({ value }) => value.split(',').map((v) => v.trim()))
  CORS_ORIGINS: string[] =
    process.env.NODE_ENV === 'production'
      ? []
      : ['http://localhost:8080', 'http://localhost:4173'];

  @IsNotEmpty()
  DATABASE_NAME: string = 'epicstory';

  @IsNotEmpty()
  DATABASE_USER: string;

  @IsNotEmpty()
  DATABASE_PASSWORD: string;

  @IsNotEmpty()
  DATABASE_HOST: string;

  @IsNotEmpty()
  DATABASE_MIGRATION_HOST: string;

  @IsNotEmpty()
  DATABASE_PORT: number;

  @IsNotEmpty()
  REDIS_URL: string;

  @IsNotEmpty()
  COOKIE_SECRET: string;

  @IsNumber()
  @Transform(({ value }) => +value)
  PASSWORD_ROUNDS: number;

  @IsNotEmpty()
  JWT_SECRET: string;

  @IsNumber()
  @Transform(({ value }) => +value)
  JWT_EXPIRES_IN: number;

  @IsNotEmpty()
  GOOGLE_CLIENT_ID: string;

  @IsNotEmpty()
  GOOGLE_CLIENT_SECRET: string;

  @IsNotEmpty()
  GOOGLE_CALLBACK_URI: string;

  @IsNotEmpty()
  GOOGLE_APP_REDIRECT_URL: string;

  @IsNotEmpty()
  DEFAULT_SENDER_EMAIL_ADDRESS: string;

  @IsNotEmpty()
  EMAIL_SMTP_URL: string;
  @IsNotEmpty()
  EMAIL_SMTP_USER: string;
  @IsNotEmpty()
  EMAIL_SMTP_PASSWORD: string;
}
