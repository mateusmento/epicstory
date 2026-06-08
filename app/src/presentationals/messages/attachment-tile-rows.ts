import type { IMessageAttachment } from "@epicstory/contracts";

/** Tile chrome for an attachment that is already uploaded (server has id/url). */
export type AttachmentMediaState =
  | { variant: "uploaded"; file: IMessageAttachment }
  | {
      variant: "uploading";
      previewUrl: string;
      mimeType: string;
      originalFilename: string;
    }
  | {
      variant: "failed";
      previewUrl: string;
      mimeType: string;
      originalFilename: string;
      message?: string;
    };

export type AttachmentTileRow =
  | { key: string; kind: "uploaded"; attachment: IMessageAttachment }
  | {
      key: string;
      kind: "uploading";
      clientId: string;
      file: File;
      previewUrl: string;
    }
  | {
      key: string;
      kind: "failed";
      clientId: string;
      file: File;
      previewUrl: string;
      message?: string;
    };
