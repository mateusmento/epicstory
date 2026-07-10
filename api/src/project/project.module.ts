import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { SchedulingModule } from 'src/scheduling/scheduling.module';
import { WorkspaceModule } from 'src/workspace/workspace.module';
import { ChannelModule } from 'src/channel/channel.module';
import { CalendarModule } from 'src/calendar/calendar.module';
import { GithubIntegrationModule } from 'src/integrations/github/github.module';
import * as controllers from './application/controllers';
import * as features from './application/features';
import * as gateways from './application/gateways';
import * as projectReactions from './application/reactions';
import * as entities from './domain/entities';
import * as services from './domain/services';
import * as repositories from './infrastructure/repositories';
import { IssueKeyAllocationService } from './application/services/issue-key-allocation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(Object.values(entities)),
    AuthModule,
    WorkspaceModule,
    NotificationsModule,
    SchedulingModule,
    ChannelModule,
    CalendarModule,
    forwardRef(() => GithubIntegrationModule),
  ],
  controllers: [...Object.values(controllers)],
  providers: [
    ...Object.values(services),
    ...Object.values(repositories),
    ...Object.values(features),
    ...Object.values(gateways),
    ...Object.values(projectReactions),
    IssueKeyAllocationService,
  ],
  exports: [],
})
export class ProjectModule {}
