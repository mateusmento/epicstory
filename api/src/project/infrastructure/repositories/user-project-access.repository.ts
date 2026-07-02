import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserProjectAccess } from 'src/project/domain/entities/user-project-access.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserProjectAccessRepository extends Repository<UserProjectAccess> {
  constructor(
    @InjectRepository(UserProjectAccess)
    repo: Repository<UserProjectAccess>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
