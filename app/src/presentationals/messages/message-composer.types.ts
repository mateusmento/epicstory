import type { UploadedAttachment } from "@epicstory/contracts";

/** Injected into {@link MessageComposer}; built by container factories so parents avoid prop drilling. */
export type MessageComposerAttachmentHandlers = {
  uploadOne: (file: File) => Promise<UploadedAttachment>;
  uploadFiles: (files: File[]) => Promise<UploadedAttachment[]>;
  removeLinkedAttachment: (attachmentId: number) => Promise<void>;
};
