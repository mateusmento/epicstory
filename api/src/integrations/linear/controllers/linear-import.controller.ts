import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { ExceptionFilter } from 'src/core';
import { JwtAuthGuard } from 'src/core/auth/jwt.strategy';
import { Auth, Issuer } from 'src/core/auth';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { LinearApiService } from '../services';
import { LinearImportJobRepository, LinearImportMismatchRepository } from '../repositories';

class CreateLinearImportJobDto {
  @IsBoolean()
  @IsOptional()
  importAll?: boolean;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  projectIds?: string[];

  // Hybrid mapping selections (optional)
  @IsOptional()
  mappings?: any;
}

@Controller('integrations/linear/workspaces')
export class LinearImportController {
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private linearApi: LinearApiService,
    private jobRepo: LinearImportJobRepository,
    private mismatchRepo: LinearImportMismatchRepository,
  ) {}

  @Get(':workspaceId/teams')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async listTeams(
    @Param('workspaceId') workspaceId: number,
    @Auth() issuer: Issuer,
  ) {
    const isMember = await this.workspaceRepo.memberExists(workspaceId, issuer.id);
    if (!isMember) throw new IssuerUserIsNotWorkspaceMember();
    return this.linearApi.listTeams(workspaceId);
  }

  @Get(':workspaceId/projects')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async listProjects(
    @Param('workspaceId') workspaceId: number,
    @Auth() issuer: Issuer,
  ) {
    const isMember = await this.workspaceRepo.memberExists(workspaceId, issuer.id);
    if (!isMember) throw new IssuerUserIsNotWorkspaceMember();
    return this.linearApi.listProjects(workspaceId);
  }

  @Post(':workspaceId/import-jobs')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async createImportJob(
    @Param('workspaceId') workspaceId: number,
    @Body() body: CreateLinearImportJobDto,
    @Auth() issuer: Issuer,
  ) {
    const isMember = await this.workspaceRepo.memberExists(workspaceId, issuer.id);
    if (!isMember) throw new IssuerUserIsNotWorkspaceMember();

    // Validate Linear connection exists early
    const { connection } = await this.linearApi.getWorkspaceClient(workspaceId);
    if (!connection) throw new NotFoundException('Linear connection not found');

    const params = {
      importAll: !!body.importAll,
      projectIds: body.projectIds ?? [],
      mappings: body.mappings ?? {},
    };

    const job = await this.jobRepo.save(
      this.jobRepo.create({
        linearConnectionId: connection.id,
        workspaceId,
        createdByUserId: issuer.id,
        status: 'pending',
        params,
        progress: {},
      }),
    );

    return job;
  }

  @Get('import-jobs/:jobId')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async getJob(@Param('jobId') jobId: string, @Auth() issuer: Issuer) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Import job not found');

    const isMember = await this.workspaceRepo.memberExists(job.workspaceId, issuer.id);
    if (!isMember) throw new IssuerUserIsNotWorkspaceMember();

    return job;
  }

  @Get('import-jobs/:jobId/mismatches')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async getMismatches(@Param('jobId') jobId: string, @Auth() issuer: Issuer) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Import job not found');

    const isMember = await this.workspaceRepo.memberExists(job.workspaceId, issuer.id);
    if (!isMember) throw new IssuerUserIsNotWorkspaceMember();

    return this.mismatchRepo.find({
      where: { jobId },
      order: { id: 'ASC' },
    });
  }
}

