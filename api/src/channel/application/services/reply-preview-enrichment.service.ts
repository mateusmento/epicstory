import { Injectable } from '@nestjs/common';
import {
  enrichMentionLabels,
  extractMentionIds,
  tiptapDocToPlainDisplayText,
} from '@epicstory/tiptap';
import { uniq } from 'lodash';
import { Channel } from 'src/channel/domain';
import { MessageReply } from 'src/channel/domain/entities';
import { MessageReplyRepository } from 'src/channel/infrastructure';
import { mapBy } from 'src/core/objects';
import type { UploadedAttachment } from '@epicstory/contracts';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import { In } from 'typeorm';
import { buildQuotedReplyPreview } from 'src/channel/domain/utils';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

@Injectable()
export class ReplyPreviewEnrichmentService {
  constructor(
    private replyRepo: MessageReplyRepository,
    private attachmentService: AttachmentService,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async enrichRepliesForPreview(
    replies: MessageReply[],
    channel: Channel,
    senderId: number,
  ): Promise<void> {
    if (replies.length === 0) return;
    const mentionIds = uniq(
      replies.flatMap((r) => extractMentionIds(r.content)),
    );
    const mentionedUsersMap = await this.workspaceRepo.findMembersMap(
      channel.workspaceId,
      mentionIds,
    );
    const replyQuoteIds = uniq(
      replies
        .map((r) => r.quotedReplyId)
        .filter((id): id is number => id != null),
    );
    const replyQuotedRows =
      replyQuoteIds.length > 0
        ? await this.replyRepo.find({
            where: { id: In(replyQuoteIds) },
            relations: { sender: true },
          })
        : [];
    const replyQuotedById = mapBy(replyQuotedRows, 'id');

    const replyIds = replies.map((r) => r.id);
    const attByReplyId =
      channel?.workspaceId != null
        ? await this.attachmentService.listAnchoredForReplies(
            channel.workspaceId,
            replyIds,
          )
        : new Map<number, UploadedAttachment[]>();

    for (const reply of replies) {
      reply.setReactions(senderId);
      const mIds = extractMentionIds(reply.content);
      (reply as any).mentionedUsers = mIds
        .map((id) => mentionedUsersMap.get(id))
        .filter(Boolean);
      (reply as any).displayContent = tiptapDocToPlainDisplayText(
        enrichMentionLabels(reply.content, mentionedUsersMap),
      );
      const qSrc = reply.quotedReplyId
        ? replyQuotedById.get(reply.quotedReplyId)
        : undefined;
      (reply as any).quotedMessage = buildQuotedReplyPreview(
        qSrc,
        mentionedUsersMap,
      );
      (reply as any).attachments = attByReplyId.get(reply.id) ?? [];
    }
  }
}
