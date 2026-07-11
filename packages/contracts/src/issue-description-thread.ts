import type { JSONContent } from "@tiptap/core";
import type { IUser } from "./user";

export type DescriptionThreadKind = "comment" | "suggestion";

export type DescriptionThreadStatus =
  | "open"
  | "resolved"
  | "accepted"
  | "rejected";

export type IDescriptionThreadMessage = {
  id: number;
  threadId: number;
  authorId: number;
  author: IUser;
  content: JSONContent;
  createdAt: string;
  editedAt: string | null;
};

export type IDescriptionThread = {
  id: number;
  issueId: number;
  workspaceId: number;
  markId: string;
  kind: DescriptionThreadKind;
  status: DescriptionThreadStatus;
  quoteText: string | null;
  proposedText: string | null;
  createdById: number;
  createdBy: IUser;
  resolvedById: number | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  messages: IDescriptionThreadMessage[];
};

export type CreateDescriptionThreadBody = {
  markId: string;
  kind: DescriptionThreadKind;
  content: JSONContent;
  quoteText?: string | null;
  proposedText?: string | null;
  /** Description JSON with the thread mark already applied. */
  description: JSONContent;
};

export type AddDescriptionThreadMessageBody = {
  content: JSONContent;
};

export type UpdateDescriptionThreadBody = {
  status: DescriptionThreadStatus;
  /** Required when accepting a suggestion — client applies the patch. */
  description?: JSONContent;
};
