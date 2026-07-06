import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SprintItem } from 'src/project/domain/entities/sprint-item.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SprintItemRepository extends Repository<SprintItem> {
  constructor(
    @InjectRepository(SprintItem)
    repo: Repository<SprintItem>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
