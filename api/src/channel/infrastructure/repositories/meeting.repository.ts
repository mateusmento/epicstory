import { InjectRepository } from '@nestjs/typeorm';
import { Meeting } from 'src/channel/domain';
import { Repository } from 'typeorm';

export class MeetingRepository extends Repository<Meeting> {
  constructor(
    @InjectRepository(Meeting)
    repo: Repository<Meeting>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
