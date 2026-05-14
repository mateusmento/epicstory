export type UploadedAttachment = {
  id: number;
  url: string;
  mimeType: string;
  originalFilename: string;
  byteSize: number;
  uploadedById?: number;
};

export type IIssueAttachmentListItem = UploadedAttachment & {
  issueId: number | null;
  messageId: number | null;
  messageReplyId: number | null;
};
