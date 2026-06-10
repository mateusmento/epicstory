import type { MentionComposerView } from "@/presentationals/rich-text/mention.types";
import type { AttachmentTileRow } from "./attachment-tile-rows";
import type { IMessage, IMessageAttachment, UploadedAttachment } from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";

/** Injected into {@link MessageComposer}; built by container factories so parents avoid prop drilling. */
export type MessageComposerAttachmentHandlers = {
  uploadOne: (file: File) => Promise<UploadedAttachment>;
  uploadFiles: (files: File[]) => Promise<UploadedAttachment[]>;
  removeLinkedAttachment: (attachmentId: number) => Promise<void>;
};

export type ComposerQuoteView = {
  senderName: string;
  excerpt: string;
};

export type ComposerAttachmentsView = {
  editingRows: AttachmentTileRow[];
  stagingRows: AttachmentTileRow[];
  scheduleHint: string | null;
  removingEditing: boolean;
  stagingBlocked: boolean;
  stagingDisabled: boolean;
};

export type ComposerToolbarView = {
  isEditing: boolean;
  isRecording: boolean;
  recordingLabel: string;
  sendLabel: string;
  attachmentsBlocked: boolean;
  scheduleSummary: string | null;
  showPollToggle: boolean;
  pollActive: boolean;
};

export type ComposerFeatures = {
  poll: boolean;
  schedule: boolean;
};

/** Normalized editing shape for core composable (poll optional). */
export type ComposerEditingView = {
  id: number;
  content: JSONContent;
  attachments?: IMessageAttachment[];
  poll?: IMessage["poll"];
} | null;

export type { MentionComposerView };
