import { Module } from '@nestjs/common';
import { FindChannelsQuery } from './application/features/find-channels.query';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Channel } from './domain/entities/channel.entity';
import { ChannelRepository } from './infrastructure/repositories/channel.repository';
import { CreateChannelCommand } from './application/features/create-channel.command';
import { WorkspaceModule } from 'src/workspace/workspace.module';
import { ChannelController } from './application/controllers/channel.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Channel]), WorkspaceModule],
  controllers: [ChannelController],
  providers: [ChannelRepository, FindChannelsQuery, CreateChannelCommand],
})
export class ChannelModule {}
