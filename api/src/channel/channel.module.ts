import { Module } from '@nestjs/common';
import { FindChannelsQuery } from './application/features/find-channels.query';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Channel } from './domain/entities/channel.entity';
import { ChannelRepository } from './infrastructure/repositories/channel.repository';
import { CreateDirectChannelCommand } from './application/features/create-direct-channel.command';
import { WorkspaceModule } from 'src/workspace/workspace.module';
import { ChannelController } from './application/controllers/channel.controller';
import { Meeting, MeetingAttendee, Message } from './domain';
import {
  MeetingAttendeeRepository,
  MeetingRepository,
  MessageRepository,
} from './infrastructure';
import { MessageController } from './application/controllers/message.controller';
import { ChannelGateway } from './application/gateways/channel.gateway';
import { MeetingGateway } from './application/gateways/meeting.gateway';
import { MeetingService } from './application/services/meeting.service';
import { MessageService } from './application/services/message.service';
import { AuthModule } from 'src/auth';

const repositories = [
  ChannelRepository,
  MessageRepository,
  MeetingRepository,
  MeetingAttendeeRepository,
];

const services = [MessageService, MeetingService];

const features = [FindChannelsQuery, CreateDirectChannelCommand];

const gateways = [ChannelGateway, MeetingGateway];

@Module({
  imports: [
    TypeOrmModule.forFeature([Channel, Message, Meeting, MeetingAttendee]),
    AuthModule,
    WorkspaceModule,
  ],
  controllers: [ChannelController, MessageController],
  providers: [repositories, services, features, gateways].flat(),
})
export class ChannelModule {}
