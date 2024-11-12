import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from 'src/workspace/domain/entities/project.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProjectRepository extends Repository<Project> {
  constructor(
    @InjectRepository(Project)
    repo: Repository<Project>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
