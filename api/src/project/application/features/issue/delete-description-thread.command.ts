import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import {
  IssueDescriptionThreadMessageRepository,
  IssueDescriptionThreadRepository,
  IssueRepository,
} from 'src/project/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';

export class DeleteDescriptionThread {
  issuer: Issuer;
  issueId: number;
  threadId: number;

  constructor(data: Partial<DeleteDescriptionThread> = {}) {
    patch(this, data);
  }
}

@CommandHandler(DeleteDescriptionThread)
export class DeleteDescriptionThreadCommand
  implements ICommandHandler<DeleteDescriptionThread>
{
  constructor(
    private issueRepo: IssueRepository,
    private workspaceRepo: WorkspaceRepository,
    private threadRepo: IssueDescriptionThreadRepository,
  ) {}

  @Transactional()
  async execute(cmd: DeleteDescriptionThread): Promise<{ markId: string }> {
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

    const markId = thread.markId;
    await this.threadRepo.remove(thread);
    return { markId };
  }
}

export class DeleteDescriptionThreadMessage {
  issuer: Issuer;
  issueId: number;
  threadId: number;
  messageId: number;

  constructor(data: Partial<DeleteDescriptionThreadMessage> = {}) {
    patch(this, data);
  }
}

@CommandHandler(DeleteDescriptionThreadMessage)
export class DeleteDescriptionThreadMessageCommand
  implements ICommandHandler<DeleteDescriptionThreadMessage>
{
  constructor(
    private issueRepo: IssueRepository,
    private workspaceRepo: WorkspaceRepository,
    private threadRepo: IssueDescriptionThreadRepository,
    private messageRepo: IssueDescriptionThreadMessageRepository,
  ) {}

  @Transactional()
  async execute(
    cmd: DeleteDescriptionThreadMessage,
  ): Promise<{ deletedThread: boolean; markId: string | null }> {
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

    const message = (thread.messages ?? []).find((m) => m.id === cmd.messageId);
    if (!message) throw new NotFoundException('Message not found');

    const sorted = [...(thread.messages ?? [])].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const isRoot = sorted[0]?.id === message.id;

    if (isRoot) {
      const markId = thread.markId;
      await this.threadRepo.remove(thread);
      return { deletedThread: true, markId };
    }

    await this.messageRepo.remove(message);
    return { deletedThread: false, markId: null };
  }
}
