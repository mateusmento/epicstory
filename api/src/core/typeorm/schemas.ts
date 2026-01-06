import {
  TypedConfigModule,
  dotenvLoader,
  selectConfig,
} from 'nest-typed-config';
import { Client } from 'pg';
import { AppConfig } from '../app.config';
import { typeorm } from './typeorm';

const config = selectConfig(
  TypedConfigModule.forRoot({
    schema: AppConfig,
    load: dotenvLoader({ expandVariables: true }),
  }),
  AppConfig,
);

export async function createPostgresSchemas() {
  const { host, port, database, username, password } =
    typeorm.postgres()(config);

  const client = new Client({
    host,
    port,
    database,
    user: username,
    password,
  });

  await client.connect();

  await client.query(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE SCHEMA IF NOT EXISTS workspace;
    CREATE SCHEMA IF NOT EXISTS channel;
    CREATE SCHEMA IF NOT EXISTS scheduler;
  `);
}
