import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { ScheduledJob } from 'src/scheduling/entities';
import { ScheduledJobTypes } from 'src/scheduling/constants';
import { WorkspacePurgePayload } from 'src/scheduling/types';
import { WorkspaceStatus } from 'src/workspace/domain/values/workspace-status.value';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { DataSource } from 'typeorm';

export class DeleteWorkspace {
  workspaceId: number;
  issuer: Issuer;

  constructor(data: Partial<DeleteWorkspace> = {}) {
    patch(this, data);
  }
}

type MeetingKick = {
  forceLeaveAndDisconnectWorkspace(workspaceId: number): Promise<void>;
};

@CommandHandler(DeleteWorkspace)
export class DeleteWorkspaceCommand
  implements ICommandHandler<DeleteWorkspace>
{
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private dataSource: DataSource,
    private moduleRef: ModuleRef,
  ) {}

  async execute({ workspaceId, issuer }: DeleteWorkspace) {
    const member = await this.workspaceRepo.findMember(workspaceId, issuer.id);
    if (!member) throw new ForbiddenException('Not a workspace member');
    if (!member.isOwner) {
      throw new ForbiddenException('Only the workspace owner can delete it');
    }

    const workspace = await this.workspaceRepo.get(workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');

    if (workspace.status === WorkspaceStatus.DELETING) {
      return { status: 'deleting' as const };
    }

    try {
      const meetingKick = this.moduleRef.get<MeetingKick>(
        'MeetingKickService',
        { strict: false },
      );
      await meetingKick.forceLeaveAndDisconnectWorkspace(workspaceId);
    } catch (ex) {
      console.log('WARNING: workspace live drain failed', ex);
    }

    workspace.status = WorkspaceStatus.DELETING;
    workspace.deletionRequestedAt = new Date();
    workspace.deletionRequestedByUserId = issuer.id;
    await this.workspaceRepo.save(workspace);

    const jobRepo = this.dataSource.getRepository(ScheduledJob);
    const existing = await jobRepo.findOne({
      where: {
        workspaceId,
        type: ScheduledJobTypes.workspace_purge,
        processed: false,
      },
    });
    if (!existing) {
      await jobRepo.save(
        ScheduledJob.create({
          type: ScheduledJobTypes.workspace_purge,
          workspaceId,
          payload: new WorkspacePurgePayload({
            workspaceId,
            requestedByUserId: issuer.id,
          }),
          dueAt: new Date(),
          notifyMinutesBefore: 0,
          recurrence: { frequency: 'once' },
        }),
      );
    }

    return { status: 'deleting' as const };
  }
}
