import type { IIssueAttachmentListItem } from "@epicstory/contracts";

export type IssueAttachmentTileRow =
  | { key: string; kind: "persisted"; item: IIssueAttachmentListItem }
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
