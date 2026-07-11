import type { JSONContent } from '@tiptap/core';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { normalizeTiptapDoc, tiptapToPlainText } from '@epicstory/tiptap';
import { UserRepository, userToIUser } from 'src/auth';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import {
  IssueDescriptionThread,
  IssueDescriptionThreadMessage,
} from 'src/project/domain/entities';
import {
  IssueDescriptionThreadMessageRepository,
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

export class CreateDescriptionThread {
  issuer: Issuer;
  issueId: number;

  @IsUUID()
  markId: string;

  @IsIn(['comment', 'suggestion'])
  kind: 'comment' | 'suggestion';

  @IsNotEmpty()
  @IsObject()
  content: JSONContent;

  @IsOptional()
  @IsString()
  quoteText?: string | null;

  @ValidateIf((o: CreateDescriptionThread) => o.kind === 'suggestion')
  @IsOptional()
  @IsString()
  proposedText?: string | null;

  @IsNotEmpty()
  @IsObject()
  description: JSONContent;

  constructor(data: Partial<CreateDescriptionThread> = {}) {
    patch(this, data);
  }
}

@CommandHandler(CreateDescriptionThread)
export class CreateDescriptionThreadCommand
  implements ICommandHandler<CreateDescriptionThread>
{
  constructor(
    private issueRepo: IssueRepository,
    private workspaceRepo: WorkspaceRepository,
    private threadRepo: IssueDescriptionThreadRepository,
    private messageRepo: IssueDescriptionThreadMessageRepository,
    private userRepo: UserRepository,
  ) {}

  @Transactional()
  async execute(cmd: CreateDescriptionThread) {
    const issue = await this.issueRepo.findOne({ where: { id: cmd.issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    if (
      !(await this.workspaceRepo.memberExists(issue.workspaceId, cmd.issuer.id))
    ) {
      throw new IssuerUserIsNotWorkspaceMember();
    }

    if (cmd.kind === 'suggestion') {
      const hasQuote = !!cmd.quoteText?.trim();
      const hasProposed = !!cmd.proposedText?.trim();
      if (!hasQuote && !hasProposed) {
        throw new BadRequestException(
          'Suggestions require deleted text (quoteText) and/or proposed text',
        );
      }
    }

    const existing = await this.threadRepo.findOne({
      where: { markId: cmd.markId },
    });
    if (existing) {
      throw new BadRequestException('A thread with this markId already exists');
    }

    const thread = await this.threadRepo.save(
      IssueDescriptionThread.create({
        workspaceId: issue.workspaceId,
        issueId: issue.id,
        markId: cmd.markId,
        kind: cmd.kind,
        status: 'open',
        quoteText: cmd.quoteText?.trim() || null,
        proposedText:
          cmd.kind === 'suggestion' ? cmd.proposedText?.trim() || null : null,
        createdById: cmd.issuer.id,
      }),
    );

    await this.messageRepo.save(
      IssueDescriptionThreadMessage.create({
        threadId: thread.id,
        authorId: cmd.issuer.id,
        content: normalizeTiptapDoc(cmd.content),
      }),
    );

    const nextDescription = normalizeTiptapDoc(cmd.description);
    // Creating a thread must never wipe an existing description (empty-editor race).
    if (
      !isBlankTiptapDoc(nextDescription) ||
      isBlankTiptapDoc(issue.description)
    ) {
      issue.description = nextDescription;
      await this.issueRepo.save(issue);
    }

    return this.loadMappedThread(thread.id);
  }

  private async loadMappedThread(threadId: number) {
    const thread = await this.threadRepo.findOne({
      where: { id: threadId },
      relations: { messages: true },
      order: { messages: { createdAt: 'ASC' } },
    });
    if (!thread) throw new NotFoundException('Thread not found');

    const authorIds = [
      thread.createdById,
      ...thread.messages.map((m) => m.authorId),
    ];
    const users = await this.userRepo.find({
      where: { id: In(Array.from(new Set(authorIds))) },
    });
    const byId = new Map(users.map((u) => [u.id, userToIUser(u)]));
    return mapDescriptionThread(thread, byId);
  }
}
