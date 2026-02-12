import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LinearImportMismatch } from '../entities';

@Injectable()
export class LinearImportMismatchRepository extends Repository<LinearImportMismatch> {
  constructor(
    @InjectRepository(LinearImportMismatch) repo: Repository<LinearImportMismatch>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}

