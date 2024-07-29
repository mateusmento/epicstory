import { readdirSync } from 'fs';
import {
  TypedConfigModule,
  dotenvLoader,
  selectConfig,
} from 'nest-typed-config';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { AppConfig } from '../app.config';
import { typeorm } from './typeorm';

const config = selectConfig(
  TypedConfigModule.forRoot({
    schema: AppConfig,
    load: dotenvLoader({ expandVariables: true }),
  }),
  AppConfig,
);

export default new DataSource(
  typeorm.postgres(() => ({
    host: 'localhost',
    migrations: migrations(),
  }))(config),
);

function migrations(): any[] {
  const migrationsPath = path.resolve(__dirname, '..', 'migrations');
  const migrations = readdirSync(migrationsPath)
    .filter((filename) => /[0-9]*-Migration.*(?<!\.d)\.(ts|js)/.test(filename))
    .map((filename) => path.parse(filename).name)
    .map((filename) => require(`${migrationsPath}/${filename}`))
    .flatMap((module) => Object.values(module));
  return migrations;
}
