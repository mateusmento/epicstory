import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth';
import * as entities from './entities';
import * as gateways from './gateways';
import * as services from './services';
import * as features from './features';
import * as controllers from './controllers';
import * as repositories from './repositories';
import * as reactions from './reactions';

@Module({
  imports: [TypeOrmModule.forFeature(Object.values(entities)), AuthModule],
  controllers: [...Object.values(controllers)],
  providers: [
    ...Object.values(repositories),
    ...Object.values(features),
    ...Object.values(gateways),
    ...Object.values(services),
    ...Object.values(reactions),
  ],
  exports: [...Object.values(repositories), ...Object.values(services)],
})
export class NotificationsModule {}
