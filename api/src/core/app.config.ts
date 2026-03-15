import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import {
  dotenvLoader,
  selectConfig,
  TypedConfigModule,
} from 'nest-typed-config';

export function loadAppConfig() {
  return selectConfig(
    TypedConfigModule.forRoot({
      schema: AppConfig,
      load: dotenvLoader({ expandVariables: true }),
    }),
    AppConfig,
  );
}

export class AppConfig {
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  DEBUG: boolean = false;

  @IsNumber()
  @Transform(({ value }) => +value)
  API_PORT: number = process.env.NODE_ENV === 'production' ? 80 : 3000;

  @IsNotEmpty()
  APP_URL: string;

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

  // ---- Integrations (Linear) ----

  @IsOptional()
  LINEAR_CLIENT_ID?: string;

  @IsOptional()
  LINEAR_CLIENT_SECRET?: string;

  @IsOptional()
  LINEAR_CALLBACK_URI?: string;

  /**
   * Used to encrypt stored integration tokens at rest (recommended).
   * Provide a 32-byte (256-bit) secret, base64 encoded.
   */
  @IsOptional()
  INTEGRATIONS_ENCRYPTION_KEY?: string;
}
