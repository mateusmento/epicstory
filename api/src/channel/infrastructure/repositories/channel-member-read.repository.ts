import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChannelMemberRead } from 'src/channel/domain/entities/channel-member-read.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ChannelMemberReadRepository extends Repository<ChannelMemberRead> {
  constructor(
    @InjectRepository(ChannelMemberRead)
    repo: Repository<ChannelMemberRead>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
