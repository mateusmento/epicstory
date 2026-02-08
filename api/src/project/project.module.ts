import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { WorkspaceModule } from 'src/workspace/workspace.module';
import * as controllers from './application/controllers';
import * as features from './application/features';
import * as gateways from './application/gateways';
import * as entities from './domain/entities';
import * as services from './domain/services';
import * as repositories from './infrastructure/repositories';

@Module({
  imports: [
    TypeOrmModule.forFeature(Object.values(entities)),
    AuthModule,
    WorkspaceModule,
    NotificationsModule,
  ],
  controllers: [...Object.values(controllers)],
  providers: [
    ...Object.values(services),
    ...Object.values(repositories),
    ...Object.values(features),
    ...Object.values(gateways),
  ],
  exports: [],
})
export class ProjectModule {}
