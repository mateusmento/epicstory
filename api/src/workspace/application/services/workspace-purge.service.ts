import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CalendarEvent } from 'src/calendar/entities';
import { Channel } from 'src/channel/domain';
import { UUID } from 'crypto';
import { GithubWorkspaceIntegrationService } from 'src/integrations/github/services/github-workspace-integration.service';
import { LinearConnection } from 'src/integrations/linear/entities';
import { Notification } from 'src/notifications/entities/notification.entity';
import { IssuePurgeService } from 'src/project/application/services/issue-purge.service';
import { Project } from 'src/project/domain/entities';
import { ScheduledJob } from 'src/scheduling/entities';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import { Team } from 'src/workspace/domain/entities/team.entity';
import { TeamMember } from 'src/workspace/domain/entities/team-member.entity';
import { WorkspaceMemberInvite } from 'src/workspace/domain/entities/workspace-member-invite.entity';
import { WorkspaceMember } from 'src/workspace/domain/entities/workspace-member.entity';
import { WorkspaceStatus } from 'src/workspace/domain/values/workspace-status.value';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { DataSource } from 'typeorm';

@Injectable()
export class WorkspacePurgeService {
  private readonly logger = new Logger(WorkspacePurgeService.name);

  constructor(
    private workspaceRepo: WorkspaceRepository,
    private attachments: AttachmentService,
    private dataSource: DataSource,
    private moduleRef: ModuleRef,
  ) {}

  async purge(workspaceId: number, purgeJobId: UUID): Promise<void> {
    const workspace = await this.workspaceRepo.get(workspaceId);
    if (!workspace) {
      this.logger.log(`Workspace ${workspaceId} already gone; purge no-op`);
      return;
    }
    if (workspace.status !== WorkspaceStatus.DELETING) {
      this.logger.warn(
        `Workspace ${workspaceId} status=${workspace.status}; refusing purge`,
      );
      return;
    }

    await this.attachments.deleteAllForWorkspace(workspaceId);

    try {
      const github = this.moduleRef.get(GithubWorkspaceIntegrationService, {
        strict: false,
      });
      await github.purgeGithubForWorkspaceDeletion(workspaceId);
    } catch (ex) {
      this.logger.warn(`GitHub purge failed: ${ex}`);
    }

    await this.dataSource
      .getRepository(LinearConnection)
      .delete({ workspaceId });

    await this.dataSource
      .getRepository(ScheduledJob)
      .createQueryBuilder()
      .delete()
      .where('workspace_id = :workspaceId', { workspaceId })
      .andWhere('id != :purgeJobId', { purgeJobId })
      .execute();

    try {
      const issuePurge = this.moduleRef.get(IssuePurgeService, {
        strict: false,
      });
      await issuePurge.purgeAllForWorkspace(workspaceId);
    } catch (ex) {
      this.logger.warn(`Issue purge failed: ${ex}`);
      throw ex;
    }

    await this.dataSource.getRepository(Channel).delete({ workspaceId });

    const calendarRepo = this.dataSource.getRepository(CalendarEvent);
    const events = await calendarRepo.find({ where: { workspaceId } });
    const jobRepo = this.dataSource.getRepository(ScheduledJob);
    for (const event of events) {
      if (event.scheduledJobId) {
        await jobRepo.delete({ id: event.scheduledJobId });
      }
    }
    await calendarRepo.delete({ workspaceId });

    await this.dataSource.getRepository(Notification).delete({ workspaceId });

    await this.dataSource
      .getRepository(WorkspaceMemberInvite)
      .delete({ workspaceId });

    const teams = await this.dataSource
      .getRepository(Team)
      .find({ where: { workspaceId } });
    for (const team of teams) {
      await this.dataSource
        .getRepository(TeamMember)
        .delete({ teamId: team.id });
    }
    await this.dataSource.getRepository(Team).delete({ workspaceId });

    await this.dataSource.getRepository(Project).delete({ workspaceId });

    await this.dataSource
      .getRepository(WorkspaceMember)
      .delete({ workspaceId });

    await this.workspaceRepo.delete({ id: workspaceId });

    await jobRepo.delete({ id: purgeJobId });
  }
}
