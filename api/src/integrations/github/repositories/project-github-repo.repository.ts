import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectGithubRepo } from '../entities';

@Injectable()
export class ProjectGithubRepoRepository extends Repository<ProjectGithubRepo> {
  constructor(
    @InjectRepository(ProjectGithubRepo)
    repo: Repository<ProjectGithubRepo>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  findByProjectId(projectId: number) {
    return this.find({
      where: { projectId },
      order: { isPrimary: 'DESC', id: 'ASC' },
    });
  }
}
