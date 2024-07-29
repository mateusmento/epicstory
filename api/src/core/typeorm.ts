import { AppConfig } from './app.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { patch } from './objects';
import { DataSource, DataSourceOptions } from 'typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';

export const createTypeOrmModule = (
  options: (
    c: AppConfig,
  ) => Promise<Partial<DataSourceOptions>> = async () => ({}),
) =>
  TypeOrmModule.forRootAsync({
    inject: [AppConfig],
    dataSourceFactory: async (config) =>
      addTransactionalDataSource(new DataSource(config)),
    useFactory: async (config: AppConfig) =>
      patch(
        {
          type: 'better-sqlite3',
          database: config.DATABASE_NAME,
          enableWAL: true,
          synchronize: true,
          autoLoadEntities: true,
          logging: true,
          logger: 'advanced-console',
        } as DataSourceOptions,
        await options(config),
      ),
  });
