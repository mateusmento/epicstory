import type {
  IDescriptionThread,
  IDescriptionThreadMessage,
  IUser,
} from '@epicstory/contracts';
import {
  IssueDescriptionThread,
  IssueDescriptionThreadMessage,
} from 'src/project/domain/entities';

export function mapDescriptionThreadMessage(
  m: IssueDescriptionThreadMessage,
  authorsById: Map<number, IUser>,
): IDescriptionThreadMessage {
  const author = authorsById.get(m.authorId);
  if (!author) {
    throw new Error(`Missing author ${m.authorId} for thread message ${m.id}`);
  }
  return {
    id: m.id,
    threadId: m.threadId,
    authorId: m.authorId,
    author,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt ? m.editedAt.toISOString() : null,
  };
}

export function mapDescriptionThread(
  thread: IssueDescriptionThread,
  authorsById: Map<number, IUser>,
): IDescriptionThread {
  const createdBy = authorsById.get(thread.createdById);
  if (!createdBy) {
    throw new Error(
      `Missing creator ${thread.createdById} for thread ${thread.id}`,
    );
  }
  const messages = [...(thread.messages ?? [])].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  return {
    id: thread.id,
    issueId: thread.issueId,
    workspaceId: thread.workspaceId,
    markId: thread.markId,
    kind: thread.kind,
    status: thread.status,
    quoteText: thread.quoteText,
    proposedText: thread.proposedText,
    createdById: thread.createdById,
    createdBy,
    resolvedById: thread.resolvedById,
    resolvedAt: thread.resolvedAt ? thread.resolvedAt.toISOString() : null,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
    messages: messages.map((m) => mapDescriptionThreadMessage(m, authorsById)),
  };
}
