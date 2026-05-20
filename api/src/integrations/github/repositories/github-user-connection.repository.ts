import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GithubUserConnection } from '../entities';

@Injectable()
export class GithubUserConnectionRepository extends Repository<GithubUserConnection> {
  constructor(
    @InjectRepository(GithubUserConnection)
    repo: Repository<GithubUserConnection>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  findActiveForWorkspaceUser(workspaceId: number, userId: number) {
    return this.findOne({
      where: { workspaceId, userId, status: 'active' },
      order: { id: 'DESC' },
    });
  }
}
