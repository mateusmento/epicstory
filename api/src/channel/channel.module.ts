import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { WorkspaceModule } from 'src/workspace/workspace.module';
import * as controllers from './application/controllers';
import * as features from './application/features';
import * as gateways from './application/gateways';
import * as reactions from './application/reactions';
import * as services from './application/services';
import * as entities from './domain/entities';
import * as repositories from './infrastructure/repositories';

@Module({
  imports: [
    TypeOrmModule.forFeature(Object.values(entities)),
    AuthModule,
    WorkspaceModule,
    NotificationsModule,
  ],
  controllers: Object.values(controllers),
  providers: [
    ...Object.values(repositories),
    ...Object.values(services),
    ...Object.values(features),
    ...Object.values(reactions),
    ...Object.values(gateways),
  ].flat(),
  exports: [...Object.values(repositories), gateways.MeetingGateway],
})
export class ChannelModule {}
