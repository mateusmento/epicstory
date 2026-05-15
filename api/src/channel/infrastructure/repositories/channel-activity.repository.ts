import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChannelActivity } from 'src/channel/domain/entities/channel-activity.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ChannelActivityRepository extends Repository<ChannelActivity> {
  constructor(
    @InjectRepository(ChannelActivity)
    repo: Repository<ChannelActivity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
