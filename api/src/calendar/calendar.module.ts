import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { WorkspaceModule } from 'src/workspace/workspace.module';
import { SchedulingModule } from 'src/scheduling/scheduling.module';
import * as entities from './entities';
import * as features from './features';
import * as controllers from './controllers';
import * as repositories from './repositories';
import * as reactions from './reactions';
import { ChannelModule } from 'src/channel/channel.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature(Object.values(entities)),
    AuthModule,
    NotificationsModule,
    WorkspaceModule,
    SchedulingModule,
    ChannelModule,
  ],
  controllers: [...Object.values(controllers)],
  providers: [
    ...Object.values(repositories),
    ...Object.values(features),
    ...Object.values(reactions),
  ],
  exports: [...Object.values(repositories)],
})
export class CalendarModule {}
