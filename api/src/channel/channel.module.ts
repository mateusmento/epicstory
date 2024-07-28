import { Module } from '@nestjs/common';
import { FindChannelsQuery } from './application/features/find-channels.query';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Channel } from './domain/entities/channel.entity';
import { ChannelRepository } from './infrastructure/repositories/channel.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Channel])],
  providers: [ChannelRepository, FindChannelsQuery],
})
export class ChannelModule {}
