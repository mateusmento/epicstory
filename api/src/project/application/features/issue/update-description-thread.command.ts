import type { JSONContent } from '@tiptap/core';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsIn, IsObject, IsOptional, ValidateIf } from 'class-validator';
import { normalizeTiptapDoc, tiptapToPlainText } from '@epicstory/tiptap';
import { UserRepository, userToIUser } from 'src/auth';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import type { DescriptionThreadStatus } from 'src/project/domain/entities';
import {
  IssueDescriptionThreadRepository,
  IssueRepository,
} from 'src/project/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { In } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { mapDescriptionThread } from './description-thread.mapper';

function isBlankTiptapDoc(doc: JSONContent): boolean {
  return !tiptapToPlainText(normalizeTiptapDoc(doc), {
    stripFormatting: true,
  }).trim();
}

export class UpdateDescriptionThread {
  issuer: Issuer;
  issueId: number;
  threadId: number;

  @IsIn(['open', 'resolved', 'accepted', 'rejected'])
  status: DescriptionThreadStatus;

  @ValidateIf((o: UpdateDescriptionThread) => o.status === 'accepted')
  @IsObject()
  @IsOptional()
  description?: JSONContent;

  constructor(data: Partial<UpdateDescriptionThread> = {}) {
    patch(this, data);
  }
}

@CommandHandler(UpdateDescriptionThread)
export class UpdateDescriptionThreadCommand
  implements ICommandHandler<UpdateDescriptionThread>
{
  constructor(
    private issueRepo: IssueRepository,
    private workspaceRepo: WorkspaceRepository,
    private threadRepo: IssueDescriptionThreadRepository,
    private userRepo: UserRepository,
  ) {}

  @Transactional()
  async execute(cmd: UpdateDescriptionThread) {
    const issue = await this.issueRepo.findOne({ where: { id: cmd.issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    if (
      !(await this.workspaceRepo.memberExists(issue.workspaceId, cmd.issuer.id))
    ) {
      throw new IssuerUserIsNotWorkspaceMember();
    }

    const thread = await this.threadRepo.findOne({
      where: { id: cmd.threadId, issueId: cmd.issueId },
      relations: { messages: true },
    });
    if (!thread) throw new NotFoundException('Thread not found');

    if (cmd.status === 'accepted') {
      if (thread.kind !== 'suggestion') {
        throw new BadRequestException('Only suggestions can be accepted');
      }
      if (!cmd.description) {
        throw new BadRequestException(
          'Accepting a suggestion requires the updated description',
        );
      }
      const nextDescription = normalizeTiptapDoc(cmd.description);
      if (
        isBlankTiptapDoc(nextDescription) &&
        !isBlankTiptapDoc(issue.description)
      ) {
        throw new BadRequestException(
          'Accepting a suggestion cannot clear the issue description',
        );
      }
      issue.description = nextDescription;
      await this.issueRepo.save(issue);
    }

    if (cmd.status === 'rejected' && thread.kind !== 'suggestion') {
      throw new BadRequestException('Only suggestions can be rejected');
    }

    if (
      cmd.status === 'resolved' ||
      cmd.status === 'accepted' ||
      cmd.status === 'rejected'
    ) {
      thread.status = cmd.status;
      thread.resolvedAt = new Date();
      thread.resolvedById = cmd.issuer.id;
    } else if (cmd.status === 'open') {
      thread.status = 'open';
      thread.resolvedAt = null;
      thread.resolvedById = null;
    } else {
      throw new ForbiddenException('Invalid status transition');
    }

    await this.threadRepo.save(thread);

    const full = await this.threadRepo.findOne({
      where: { id: thread.id },
      relations: { messages: true },
    });
    if (!full) throw new NotFoundException('Thread not found');

    const authorIds = [
      full.createdById,
      ...full.messages.map((m) => m.authorId),
    ];
    const users = await this.userRepo.find({
      where: { id: In(Array.from(new Set(authorIds))) },
    });
    const byId = new Map(users.map((u) => [u.id, userToIUser(u)]));
    return mapDescriptionThread(full, byId);
  }
}
