import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth';
import * as jobs from './jobs';
import * as entities from './entities';
import * as gateways from './gateways';
import * as services from './services';
import * as features from './features';
import * as controllers from './controllers';
import * as repositories from './repositories';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature(Object.values(entities)),
    AuthModule,
  ],
  controllers: [...Object.values(controllers)],
  providers: [
    ...Object.values(repositories),
    ...Object.values(features),
    ...Object.values(gateways),
    ...Object.values(jobs),
    ...Object.values(services),
  ],
  exports: [...Object.values(repositories)],
})
export class NotificationsModule {}
