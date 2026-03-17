import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Label } from 'src/project/domain/entities';
import { Repository } from 'typeorm';

@Injectable()
export class LabelRepository extends Repository<Label> {
  constructor(
    @InjectRepository(Label)
    repo: Repository<Label>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
