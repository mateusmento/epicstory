import type { ChannelApi } from "@/domain/channels/services/channel.service";
import type { UploadedAttachment } from "@/domain/channels/services/channel.service";
import type { IssueApi } from "@/domain/issues/api";

/** Injected into {@link MessageComposer}; built with helpers below so parents avoid prop drilling. */
export type MessageComposerAttachmentHandlers = {
  uploadFiles: (files: File[]) => Promise<UploadedAttachment[]>;
  removeLinkedAttachment: (attachmentId: number) => Promise<void>;
};

/**
 * Standard channel / thread composer: stage via `POST /channels/:id/attachments`;
 * remove-while-editing via `DELETE /channels/:id/attachments/:attachmentId`.
 */
export function channelMessageComposerAttachmentHandlers(deps: {
  channelApi: ChannelApi;
  channelId: () => number;
}): MessageComposerAttachmentHandlers {
  return {
    async uploadFiles(files: File[]) {
      const channelId = deps.channelId();
      const out: UploadedAttachment[] = [];
      for (const file of files) {
        try {
          out.push(await deps.channelApi.uploadAttachment(channelId, file));
        } catch {
          /* skip failed file */
        }
      }
      return out;
    },
    async removeLinkedAttachment(attachmentId: number) {
      await deps.channelApi.deleteChannelAttachment(deps.channelId(), attachmentId);
    },
  };
}

/**
 * Issue activity composer: stage via the **comment channel** (so `channelId` + `linkStagingToMessage`
 * keep working). Remove-while-editing uses `DELETE /issues/:id/attachments/:attachmentId`.
 *
 * When the API supports `issueId` on channel uploads (or issue staging with `channelId`),
 * adjust only this factory — not `MessageComposer`.
 */
export function issueActivityMessageComposerAttachmentHandlers(deps: {
  issueApi: IssueApi;
  issueId: () => number;
  channelApi: ChannelApi;
  commentChannelId: () => number;
}): MessageComposerAttachmentHandlers {
  return {
    async uploadFiles(files: File[]) {
      const channelId = deps.commentChannelId();
      const out: UploadedAttachment[] = [];
      for (const file of files) {
        try {
          out.push(await deps.channelApi.uploadAttachment(channelId, file));
        } catch {
          /* skip failed file */
        }
      }
      return out;
    },
    async removeLinkedAttachment(attachmentId: number) {
      await deps.issueApi.deleteIssueAttachment(deps.issueId(), attachmentId);
    },
  };
}
