import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  dotenvLoader,
  selectConfig,
  TypedConfigModule,
} from 'nest-typed-config';
import { jwtExpiresInToSeconds } from './auth';

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
  DEBUG: boolean = true;

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
  @Transform(({ value }) => jwtExpiresInToSeconds(value))
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

  @IsNotEmpty()
  AWS_REGION: string;

  @IsNotEmpty()
  AWS_ACCESS_KEY_ID: string;

  @IsNotEmpty()
  AWS_SECRET_ACCESS_KEY: string;

  @IsNotEmpty()
  AWS_BUCKET: string;

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

  /** Unlinked composer uploads older than this are purged (DB rows). Default 72h. */
  @IsNumber()
  @Transform(({ value }) => (value == null || value === '' ? 72 : +value))
  ATTACHMENT_STAGING_TTL_HOURS: number = 72;

  // ---- Integrations (GitHub API — Redis/memory cache, HTTP backoff) ----

  /** Store GitHub read caches in Redis (`RedisService` / `REDIS_URL`). */
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => !(value === 'false' || value === false))
  GITHUB_CACHE_USE_REDIS: boolean = true;

  /** Invalidate GitHub caches when an admin changes installation/repo linkage in Epicstory. */
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => !(value === 'false' || value === false))
  GITHUB_CACHE_INVALIDATE_ON_ADMIN_ACTIONS: boolean = true;

  /** Invalidate GitHub caches on `installation_repositories` + `repository` webhook deliveries. */
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => !(value === 'false' || value === false))
  GITHUB_CACHE_INVALIDATE_ON_REPO_WEBHOOKS: boolean = true;

  @IsString()
  @Transform(({ value }) =>
    value == null || value === '' ? 'github:' : String(value).trim(),
  )
  GITHUB_CACHE_KEY_PREFIX: string = 'github:';

  /** Single-repo metadata (REST / GraphQL snapshot). */
  @IsNumber()
  @Transform(({ value }) => (value == null || value === '' ? 300 : +value))
  GITHUB_CACHE_REPO_METADATA_TTL_SEC: number = 300;

  /** Installation-visible repo lists (paginated). Shorter TTL — changes when repos added/removed. */
  @IsNumber()
  @Transform(({ value }) => (value == null || value === '' ? 120 : +value))
  GITHUB_CACHE_REPO_LIST_TTL_SEC: number = 120;

  /** Default branch name cache when stored separately from full metadata. */
  @IsNumber()
  @Transform(({ value }) => (value == null || value === '' ? 300 : +value))
  GITHUB_CACHE_DEFAULT_BRANCH_TTL_SEC: number = 300;

  @IsNumber()
  @Transform(({ value }) => (value == null || value === '' ? 30_000 : +value))
  GITHUB_HTTP_TIMEOUT_MS: number = 30_000;

  /** Total tries per request including the first attempt (429 / retryable 5xx only). */
  @IsNumber()
  @Transform(({ value }) => (value == null || value === '' ? 5 : +value))
  GITHUB_HTTP_RETRY_MAX_ATTEMPTS: number = 5;

  @IsNumber()
  @Transform(({ value }) => (value == null || value === '' ? 500 : +value))
  GITHUB_HTTP_RETRY_INITIAL_DELAY_MS: number = 500;

  @IsNumber()
  @Transform(({ value }) => (value == null || value === '' ? 30_000 : +value))
  GITHUB_HTTP_RETRY_MAX_DELAY_MS: number = 30_000;

  @IsNumber()
  @Transform(({ value }) => (value == null || value === '' ? 2 : +value))
  GITHUB_HTTP_RETRY_BACKOFF_MULTIPLIER: number = 2;

  /** Extra delay fraction in [0, 1] applied as random jitter on backoff. */
  @IsNumber()
  @Transform(({ value }) => (value == null || value === '' ? 0.2 : +value))
  GITHUB_HTTP_RETRY_JITTER: number = 0.2;

  /** Re-mint installation access tokens at least this many seconds before GitHub expiry. */
  @IsNumber()
  @Transform(({ value }) => (value == null || value === '' ? 120 : +value))
  GITHUB_INSTALLATION_TOKEN_REFRESH_SKEW_SEC: number = 120;

  /** Proactively refresh user-to-server tokens when within this skew of expiry (if refresh tokens exist). */
  @IsNumber()
  @Transform(({ value }) => (value == null || value === '' ? 300 : +value))
  GITHUB_USER_TOKEN_REFRESH_SKEW_SEC: number = 300;

  /**
   * If a GitHub call returns 401 with an installation token, drop cache, re-mint once, retry that request once (no loops).
   */
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => !(value === 'false' || value === false))
  GITHUB_INSTALLATION_TOKEN_RETRY_REQUEST_ON_401: boolean = true;

  /**
   * Persist and use GitHub **user-to-server** refresh_token grants when GitHub returns them (configure the GitHub App / authorization per GitHub docs).
   */
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => !(value === 'false' || value === false))
  GITHUB_USER_SERVER_REFRESH_TOKEN_ENABLED: boolean = true;

  /**
   * Limit concurrent outbound GitHub HTTP calls per workspace (0 = no limit).
   * Helps avoid burning shared rate limits across tabs/users.
   */
  @IsNumber()
  @Transform(({ value }) => (value == null || value === '' ? 4 : +value))
  GITHUB_HTTP_MAX_CONCURRENT_REQUESTS_PER_WORKSPACE: number = 4;

  /** GitHub App (manifest) — optional until integration is wired for an environment. */
  @IsOptional()
  @IsString()
  GITHUB_APP_ID?: string;

  @IsOptional()
  @IsString()
  GITHUB_APP_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  GITHUB_APP_CLIENT_SECRET?: string;

  /** Verify `X-Hub-Signature-256` on webhook deliveries. */
  @IsOptional()
  @IsString()
  GITHUB_APP_WEBHOOK_SECRET?: string;

  /**
   * Purge `integration.github_webhook_delivery_receipts` rows older than this (daily job).
   * Set to **0** to disable pruning.
   */
  @IsNumber()
  @Transform(({ value }) => (value == null || value === '' ? 30 : +value))
  GITHUB_WEBHOOK_DELIVERY_RECEIPT_RETENTION_DAYS: number = 30;

  /**
   * Poll GitHub for rows in `issue_github_pull_requests` still **open** in Epicstory, in case webhooks were missed.
   */
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => !(value === 'false' || value === false))
  GITHUB_PR_RECONCILE_ENABLED: boolean = true;

  @IsNumber()
  @Transform(({ value }) => (value == null || value === '' ? 25 : +value))
  GITHUB_PR_RECONCILE_BATCH_SIZE: number = 25;

  /** PEM contents or path — consumed when minting JWTs for installation tokens (future). */
  @IsOptional()
  @IsString()
  GITHUB_APP_PRIVATE_KEY?: string;

  /** POST `/api/integrations/github/install/callback` target after GitHub App setup (admin install). */
  @IsOptional()
  @IsString()
  GITHUB_APP_INSTALL_CALLBACK_URL?: string;

  /** Member user-to-server OAuth callback (`/integrations/github/user/callback`). */
  @IsOptional()
  @IsString()
  GITHUB_APP_USER_CALLBACK_URL?: string;

  /**
   * Public app slug for `https://github.com/apps/<slug>/installations/new`.
   */
  @IsOptional()
  @IsString()
  GITHUB_APP_SLUG?: string;

  getGithubInstallCallbackUrl(): string {
    const explicit = this.GITHUB_APP_INSTALL_CALLBACK_URL?.trim();
    if (explicit) return explicit;
    return `${this.APP_URL.replace(/\/$/, '')}/api/integrations/github/install/callback`;
  }

  getGithubUserCallbackUrl(): string {
    const explicit = this.GITHUB_APP_USER_CALLBACK_URL?.trim();
    if (explicit) return explicit;
    return `${this.APP_URL.replace(/\/$/, '')}/api/integrations/github/user/callback`;
  }

  /** Webhook URL to register on the GitHub App (`POST`, `X-Hub-Signature-256`). */
  getGithubWebhookUrl(): string {
    return `${this.APP_URL.replace(/\/$/, '')}/api/integrations/github/webhook`;
  }

  /** True when App id + client id + secret are set (private key required later for API calls). */
  isGithubAppRegistrationComplete(): boolean {
    return Boolean(
      this.GITHUB_APP_ID &&
        this.GITHUB_APP_CLIENT_ID &&
        this.GITHUB_APP_CLIENT_SECRET,
    );
  }
}
