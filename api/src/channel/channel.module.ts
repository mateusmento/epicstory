import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth';
import { CalendarModule } from 'src/calendar/calendar.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { SchedulingModule } from 'src/scheduling/scheduling.module';
import { Issue } from 'src/project/domain/entities';
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
    TypeOrmModule.forFeature([...Object.values(entities), Issue]),
    AuthModule,
    WorkspaceModule,
    NotificationsModule,
    SchedulingModule,
    forwardRef(() => CalendarModule),
  ],
  controllers: Object.values(controllers),
  providers: [
    ...Object.values(repositories),
    ...Object.values(services),
    ...Object.values(features),
    ...Object.values(reactions),
    ...Object.values(gateways),
    { provide: 'MeetingGateway', useExisting: gateways.MeetingGateway },
    {
      provide: 'MeetingKickService',
      useExisting: services.MeetingKickService,
    },
  ].flat(),
  exports: [
    ...Object.values(repositories),
    gateways.MeetingGateway,
    gateways.MessageGateway,
    services.MessageService,
    services.MeetingKickService,
    services.ReplyService,
  ],
})
export class ChannelModule {}
