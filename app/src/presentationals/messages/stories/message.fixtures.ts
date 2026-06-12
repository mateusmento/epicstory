import { messageGroup } from "@/presentationals/stories/fixtures/message-groups";
import { storyDirectChannel, storyUsers } from "@/presentationals/stories/fixtures";
import type { AttachmentTileRow } from "@/presentationals/messages/attachment-tile-rows";
import type {
  ComposerAttachmentsView,
  ComposerToolbarView,
} from "@/presentationals/messages/message-composer.types";
import type {
  IChannelActivity,
  IMessage,
  IMessageAttachment,
  MessagePollBody,
  MessagePollClient,
} from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";

export function tiptapDoc(text: string): JSONContent {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: text ? [{ type: "text", text }] : [] }],
  };
}

export const storyMessage = {
  ...messageGroup.value.messages[0],
  channel: storyDirectChannel,
  mentionedUsers: [storyUsers.daiana],
} as IMessage;

export const storyQuotedMessage = {
  ...storyMessage,
  id: 88,
  displayContent: "A quoted message from earlier in the thread.",
} as IMessage;

export function makeAttachment(partial: Partial<IMessageAttachment> = {}): IMessageAttachment {
  return {
    id: partial.id ?? 1,
    url: partial.url ?? "https://picsum.photos/320/180",
    originalFilename: partial.originalFilename ?? "mock-image.png",
    mimeType: partial.mimeType ?? "image/png",
    uploadedById: partial.uploadedById ?? storyUsers.jean.id,
    ...partial,
  } as IMessageAttachment;
}

export const storyAttachments: IMessageAttachment[] = [
  makeAttachment({ id: 11, originalFilename: "release-notes.png", mimeType: "image/png" }),
  makeAttachment({
    id: 12,
    originalFilename: "demo.mp4",
    mimeType: "video/mp4",
    url: "https://www.w3schools.com/html/mov_bbb.mp4",
  }),
  makeAttachment({
    id: 13,
    originalFilename: "plan.pdf",
    mimeType: "application/pdf",
    url: "https://example.com/plan.pdf",
  }),
];

export const storyPoll = {
  question: "Which milestone should ship first?",
  options: [
    { id: "a", label: "Messaging polish" },
    { id: "b", label: "Meetings beta" },
    { id: "c", label: "Issue board updates" },
  ],
  optionVotes: { a: 4, b: 2, c: 1 },
  totalVotes: 7,
  myOptionId: "a",
} as MessagePollClient;

export function makePollBody(): MessagePollBody {
  return {
    question: "Where should we run the next standup?",
    options: [
      { id: "opt-1", label: "Project channel" },
      { id: "opt-2", label: "Voice meeting room" },
    ],
  };
}

export function makeFile(name: string, type: string): File {
  return new File(["story"], name, { type });
}

export function makeAttachmentRows(): AttachmentTileRow[] {
  return [
    { key: "up-1", kind: "uploaded", attachment: storyAttachments[0] },
    {
      key: "uploading-1",
      kind: "uploading",
      clientId: "uploading-1",
      file: makeFile("screenshot.png", "image/png"),
      previewUrl: "https://picsum.photos/220/120",
    },
    {
      key: "failed-1",
      kind: "failed",
      clientId: "failed-1",
      file: makeFile("recording.mp4", "video/mp4"),
      previewUrl: "https://picsum.photos/240/130",
      message: "Upload failed",
    },
  ];
}

export function makeComposerAttachmentsView(): ComposerAttachmentsView {
  return {
    editingRows: [{ key: "edit-1", kind: "uploaded", attachment: storyAttachments[1] }],
    stagingRows: makeAttachmentRows(),
    scheduleHint: "Attachments will be delivered when scheduled time arrives.",
    removingEditing: false,
    stagingBlocked: false,
    stagingDisabled: false,
  };
}

export function makeToolbarView(partial: Partial<ComposerToolbarView> = {}): ComposerToolbarView {
  return {
    isEditing: false,
    isRecording: false,
    recordingLabel: "00:09",
    sendLabel: "Send",
    attachmentsBlocked: false,
    scheduleSummary: null,
    showPollToggle: true,
    pollActive: false,
    ...partial,
  };
}

export const storyMeetingActivity = {
  id: 901,
  type: "meeting_started",
  actor: storyUsers.sean,
  meetingId: 77,
  createdAt: new Date().toISOString(),
} as unknown as IChannelActivity;
