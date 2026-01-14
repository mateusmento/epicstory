import { Test } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { AppModule } from 'src/app.module';
import { Wait } from 'testcontainers';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { typeorm } from '../typeorm';
import entities from '../typeorm/entities';
import { migrations, runMigrations } from '../typeorm/migrations';

export async function startPostgresTestContainer() {
  return await new PostgreSqlContainer('postgres:14')
    .withDatabase('epicstory')
    .withUsername('epicstory')
    .withPassword('epicstory')
    .withWaitStrategy(
      Wait.forLogMessage('listening on IPv4 address "0.0.0.0", port', 1),
    )
    .start();
}

export async function createTestingModule(
  postgres: StartedPostgreSqlContainer,
) {
  initializeTransactionalContext();

  const module = await Test.createTestingModule({
    imports: [
      typeorm.createModule(
        typeorm.postgres(() => ({
          host: postgres.getHost(),
          port: postgres.getPort(),
          database: postgres.getDatabase(),
          username: postgres.getUsername(),
          password: postgres.getPassword(),
          synchronize: false,
          logging: false,
          autoLoadEntities: false,
          entities,
          migrations: migrations(),
        })),
      ),
      AppModule,
    ],
  }).compile();

  await module.init();

  await runMigrations(module.get(DataSource));

  return module;
}

export async function truncateTables(
  dataSource: DataSource,
  tables: (new () => any)[],
) {
  // Get table names from TypeORM metadata and truncate with identity reset
  const getTableName = (entity: new () => any) => {
    const metadata = dataSource.getMetadata(entity);
    const schema = metadata.schema ? `"${metadata.schema}".` : '';
    return `${schema}"${metadata.tableName}"`;
  };

  // Get join table names from ManyToMany relationships
  const getJoinTables = (entity: new () => any): string[] => {
    const metadata = dataSource.getMetadata(entity);
    return metadata.manyToManyRelations
      .filter((relation) => relation.isOwning && (relation as any).joinTable)
      .map((relation) => {
        const joinTable = (relation as any).joinTable;
        const schema = joinTable.schema || metadata.schema || 'public';
        const tableName = joinTable.name;
        return `"${schema}"."${tableName}"`;
      });
  };

  // Collect all tables: entities + join tables (from entities with ManyToMany relationships)
  const tableNames = tables
    .map((e) => [getTableName(e), ...getJoinTables(e)])
    .flat();

  const allTables = tableNames.join(', ');

  // Truncate tables with RESTART IDENTITY to reset auto-increment counters
  // CASCADE handles foreign key dependencies automatically
  await dataSource.query(
    `TRUNCATE TABLE ${allTables} RESTART IDENTITY CASCADE`,
  );
}
