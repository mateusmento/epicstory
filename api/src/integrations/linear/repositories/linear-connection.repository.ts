import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LinearConnection } from '../entities';

@Injectable()
export class LinearConnectionRepository extends Repository<LinearConnection> {
  constructor(
    @InjectRepository(LinearConnection) repo: Repository<LinearConnection>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  findWorkspaceConnection(workspaceId: number) {
    return this.findOne({
      where: { workspaceId, status: 'active' },
      order: { id: 'DESC' },
    });
  }
}
