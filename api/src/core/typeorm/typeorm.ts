import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { AppConfig } from '../app.config';
import { BetterSqlite3ConnectionOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

type OptionsFactory<T> = (c: AppConfig) => Partial<T>;

const createTypeOrmModule = (
  options: (c: AppConfig) => Partial<DataSourceOptions> = () => ({}),
) =>
  TypeOrmModule.forRootAsync({
    inject: [AppConfig],
    dataSourceFactory: async (config) =>
      addTransactionalDataSource(new DataSource(config)),
    useFactory: async (config: AppConfig) => options(config),
  });

const postgres =
  (options: OptionsFactory<PostgresConnectionOptions> = () => ({})) =>
  (config: AppConfig) => {
    const opt = options(config);

    // Scheduling recurrence uses Postgres functions that depend on the *session* TimeZone
    // (e.g. date_trunc('day', timestamptz) and extract(dow from timestamptz)).
    // We standardize the session TZ to UTC to make recurrence evaluation deterministic.
    const baseExtra = (opt as any).extra ?? {};
    const prevOptions = String(baseExtra.options ?? '').trim();
    const mergedOptions = [prevOptions, `-c TimeZone=UTC`]
      .filter(Boolean)
      .join(' ')
      .trim();

    const mergedExtra = {
      ...baseExtra,
      options: mergedOptions,
    };

    return {
      type: 'postgres',
      host: config.DATABASE_HOST,
      port: config.DATABASE_PORT,
      username: config.DATABASE_USER,
      password: config.DATABASE_PASSWORD,
      database: config.DATABASE_NAME,
      logger: 'advanced-console',
      autoLoadEntities: false,
      namingStrategy: new SnakeNamingStrategy(),
      ...opt,
      extra: mergedExtra,
    } satisfies TypeOrmModuleOptions;
  };

const betterSqlite =
  (options: OptionsFactory<BetterSqlite3ConnectionOptions> = () => ({})) =>
  (config: AppConfig) =>
    ({
      type: 'better-sqlite3',
      enableWAL: true,
      database: config.DATABASE_NAME,
      synchronize: true,
      logging: 'all',
      logger: 'advanced-console',
      autoLoadEntities: true,
      namingStrategy: new SnakeNamingStrategy(),
      ...options(config),
    }) satisfies TypeOrmModuleOptions;

export const typeorm = {
  postgres,
  betterSqlite,
  createModule: createTypeOrmModule,
};
