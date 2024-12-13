import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BacklogItem } from 'src/project/domain/entities/backlog-item.entity';
import { Repository } from 'typeorm';

@Injectable()
export class BacklogItemRepository extends Repository<BacklogItem> {
  constructor(@InjectRepository(BacklogItem) repo: Repository<BacklogItem>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
