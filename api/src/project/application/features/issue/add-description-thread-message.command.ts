import type { JSONContent } from '@tiptap/core';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsObject } from 'class-validator';
import { UserRepository, userToIUser } from 'src/auth';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssueDescriptionThreadMessage } from 'src/project/domain/entities';
import {
  IssueDescriptionThreadMessageRepository,
  IssueDescriptionThreadRepository,
  IssueRepository,
} from 'src/project/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { normalizeTiptapDoc } from '@epicstory/tiptap';
import { In } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { mapDescriptionThread } from './description-thread.mapper';

export class AddDescriptionThreadMessage {
  issuer: Issuer;
  issueId: number;
  threadId: number;

  @IsNotEmpty()
  @IsObject()
  content: JSONContent;

  constructor(data: Partial<AddDescriptionThreadMessage> = {}) {
    patch(this, data);
  }
}

@CommandHandler(AddDescriptionThreadMessage)
export class AddDescriptionThreadMessageCommand
  implements ICommandHandler<AddDescriptionThreadMessage>
{
  constructor(
    private issueRepo: IssueRepository,
    private workspaceRepo: WorkspaceRepository,
    private threadRepo: IssueDescriptionThreadRepository,
    private messageRepo: IssueDescriptionThreadMessageRepository,
    private userRepo: UserRepository,
  ) {}

  @Transactional()
  async execute(cmd: AddDescriptionThreadMessage) {
    const issue = await this.issueRepo.findOne({ where: { id: cmd.issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    if (
      !(await this.workspaceRepo.memberExists(issue.workspaceId, cmd.issuer.id))
    ) {
      throw new IssuerUserIsNotWorkspaceMember();
    }

    const thread = await this.threadRepo.findOne({
      where: { id: cmd.threadId, issueId: cmd.issueId },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    if (thread.status !== 'open') {
      throw new ForbiddenException('Cannot reply to a closed thread');
    }

    await this.messageRepo.save(
      IssueDescriptionThreadMessage.create({
        threadId: thread.id,
        authorId: cmd.issuer.id,
        content: normalizeTiptapDoc(cmd.content),
      }),
    );

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
