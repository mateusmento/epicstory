import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import {
  IssueActivityRepository,
  IssueRepository,
} from 'src/project/infrastructure/repositories';
import type { CreatedAttachmentDto } from 'src/workspace/application/services/attachment.service';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';

export class UploadIssueAttachment {
  issuer: Issuer;
  issueId: number;
  file: Express.Multer.File;

  constructor(data: Partial<UploadIssueAttachment> = {}) {
    patch(this, data);
  }
}

@CommandHandler(UploadIssueAttachment)
export class UploadIssueAttachmentCommand
  implements ICommandHandler<UploadIssueAttachment>
{
  constructor(
    private issueRepo: IssueRepository,
    private workspaceRepo: WorkspaceRepository,
    private attachmentService: AttachmentService,
    private issueActivities: IssueActivityRepository,
  ) {}

  @Transactional()
  async execute({
    issuer,
    issueId,
    file,
  }: UploadIssueAttachment): Promise<CreatedAttachmentDto> {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    if (
      !(await this.workspaceRepo.memberExists(issue.workspaceId, issuer.id))
    ) {
      throw new IssuerUserIsNotWorkspaceMember();
    }

    const created = await this.attachmentService.createFromUpload({
      workspaceId: issue.workspaceId,
      issueId,
      uploadedById: issuer.id,
      file,
    });

    await this.issueActivities.save(
      this.issueActivities.create({
        issueId,
        actorId: issuer.id,
        type: 'attachment_added',
        messageId: null,
        attachmentId: created.id,
        payload: {},
      }),
    );

    return created;
  }
}
