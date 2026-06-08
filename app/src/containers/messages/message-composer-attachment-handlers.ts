import { ChannelApi } from "@epicstory/api-client";
import type { IssueApi } from "@epicstory/api-client";
import type { UploadedAttachment } from "@epicstory/contracts";
import type { MessageComposerAttachmentHandlers } from "@/presentationals/messages/message-composer.types";

export type { MessageComposerAttachmentHandlers } from "@/presentationals/messages/message-composer.types";

/**
 * Standard channel / thread composer: stage via `POST /channels/:id/attachments`;
 * remove-while-editing via `DELETE /channels/:id/attachments/:attachmentId`.
 */
export function channelMessageComposerAttachmentHandlers(deps: {
  channelApi: ChannelApi;
  channelId: () => number;
}): MessageComposerAttachmentHandlers {
  async function uploadOne(file: File): Promise<UploadedAttachment> {
    return deps.channelApi.uploadAttachment(deps.channelId(), file);
  }

  return {
    uploadOne,
    async uploadFiles(files: File[]) {
      const out: UploadedAttachment[] = [];
      for (const file of files) {
        try {
          out.push(await uploadOne(file));
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
  async function uploadOne(file: File): Promise<UploadedAttachment> {
    return deps.channelApi.uploadAttachment(deps.commentChannelId(), file);
  }

  return {
    uploadOne,
    async uploadFiles(files: File[]) {
      const out: UploadedAttachment[] = [];
      for (const file of files) {
        try {
          out.push(await uploadOne(file));
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
