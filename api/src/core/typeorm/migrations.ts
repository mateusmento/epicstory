import { readdirSync } from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { loadAppConfig } from '../app.config';
import entities from './entities';
import { typeorm } from './typeorm';

const config = loadAppConfig();

export default new DataSource(
  typeorm.postgres(() => ({
    host: config.DATABASE_MIGRATION_HOST ?? config.DATABASE_HOST,
    logging: 'all',
    logger: 'advanced-console',
    autoLoadEntities: false,
    entities,
    migrations: migrations(),
  }))(config),
);

export function migrations(): any[] {
  const migrationsPath = path.resolve(__dirname, '..', 'migrations');
  const migrations = readdirSync(migrationsPath)
    .filter((filename) => /^\d+-Migration.*(?<!\.d)\.(ts|js)$/.test(filename))
    .map((filename) => path.parse(filename).name)
    .map((filename) => require(`${migrationsPath}/${filename}`))
    .flatMap((module) => Object.values(module));
  return migrations;
}

export async function runMigrations(dataSource: DataSource) {
  await createPostgresSchemas(dataSource);
  console.log('Running migrations...');
  await dataSource.runMigrations();
  console.log('Migrations ran successfully');
}

export async function createPostgresSchemas(dataSource: DataSource) {
  await dataSource.query(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE SCHEMA IF NOT EXISTS workspace;
    CREATE SCHEMA IF NOT EXISTS channel;
    CREATE SCHEMA IF NOT EXISTS scheduler;
  `);
}
