import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ScheduledJobTypes } from 'src/scheduling/constants';
import {
  ScheduledJobWithPayload,
  WorkspacePurgePayload,
} from 'src/scheduling/types';
import { WorkspacePurgeService } from '../services/workspace-purge.service';

@Injectable()
export class WorkspacePurgeReaction {
  private readonly logger = new Logger(WorkspacePurgeReaction.name);

  constructor(private workspacePurge: WorkspacePurgeService) {}

  @OnEvent(`scheduled-job.${ScheduledJobTypes.workspace_purge}`, {
    async: true,
  })
  async handle(job: ScheduledJobWithPayload<WorkspacePurgePayload>) {
    const workspaceId = job.payload?.workspaceId ?? job.workspaceId;
    this.logger.log(`Running workspace purge for workspace ${workspaceId}`);
    await this.workspacePurge.purge(workspaceId, job.id);
  }
}
