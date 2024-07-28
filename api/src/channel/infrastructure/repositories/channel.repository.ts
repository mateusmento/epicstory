import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ChannelRepository extends Repository<Channel> {
  constructor(
    @InjectRepository(Channel)
    repo: Repository<Channel>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
