import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GithubInstallation } from '../entities';

@Injectable()
export class GithubInstallationRepository extends Repository<GithubInstallation> {
  constructor(
    @InjectRepository(GithubInstallation)
    repo: Repository<GithubInstallation>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  findByWorkspaceId(workspaceId: number) {
    return this.findOne({
      where: { workspaceId },
      order: { id: 'DESC' },
    });
  }
}
