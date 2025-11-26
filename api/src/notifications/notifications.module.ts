import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth';
import { NotificationsCronjob } from './notifications.cronjob';
import { ScheduledEvent } from './scheduled-event.entity';
import { Notification } from './notification.entity';
import { NotificationGateway } from './notifications.gateway';
import { CreateScheduledEventCommand } from './create-scheduled-event.command';
import { ScheduledEventController } from './scheduled-event.controller';
import { NotificationController } from './notification.controller';
import { ScheduledEventRepository } from './scheduled-event.repository';
import { NotificationRepository } from './notification.repository';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([ScheduledEvent, Notification]),
    AuthModule,
  ],
  controllers: [ScheduledEventController, NotificationController],
  providers: [
    NotificationsCronjob,
    NotificationGateway,
    CreateScheduledEventCommand,
    ScheduledEventRepository,
    NotificationRepository,
  ],
  exports: [ScheduledEventRepository],
})
export class NotificationsModule {}
