import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Identity } from 'src/auth/domain/entities/identity.entity';
import { Repository } from 'typeorm';

@Injectable()
export class IdentityRepository extends Repository<Identity> {
  constructor(
    @InjectRepository(Identity)
    repo: Repository<Identity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
