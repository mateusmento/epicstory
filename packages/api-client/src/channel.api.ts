import type {
  ChannelGroupsPage,
  CreateDirectChannel,
  CreateDirectOrMultiDirectChannel,
  CreateGroupChannel,
  CreateMeetingChannel,
  CreateScheduledMessageBody,
  FindChannelActivities,
  FindMessageReplies,
  IChannel,
  IChannelActivity,
  IMessage,
  IReaction,
  IReply,
  IScheduledMessage,
  ISearchChannelsAndUsersItem,
  IUser,
  MessagePollBody,
  Page,
  SendChannelMessageResponse,
  ToggleReactionResponse,
  UpdateChannelMessageBody,
  UpdateScheduledMessageBody,
  UploadedAttachment,
  VoteMessagePollResponse,
} from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";
import type { AxiosInstance } from "axios";
import { Axios as AxiosImport } from "axios";
import { inject, injectable } from "tsyringe";

@injectable()
export class ChannelApi {
  constructor(@inject(AxiosImport) protected readonly axios: AxiosInstance) {}

  findChannels(workspaceId: number) {
    return this.axios
      .get<IChannel[]>(`/workspaces/${workspaceId}/channels`)
      .then((res) => res.data);
  }

  searchChannelsAndUsers(
    workspaceId: number,
    params: { q?: string; page?: number; count?: number },
  ) {
    return this.axios
      .get<
        Page<ISearchChannelsAndUsersItem>
      >(`/workspaces/${workspaceId}/channels/search`, { params })
      .then((res) => res.data);
  }

  findChannelGroups(
    workspaceId: number,
    params?: {
      teamId?: number;
      groupPage?: number;
      meetingPage?: number;
      directPage?: number;
      count?: number;
    },
  ) {
    return this.axios
      .get<ChannelGroupsPage>(`/workspaces/${workspaceId}/channels/groups`, {
        params,
      })
      .then((res) => res.data);
  }

  findChannel(channelId: number) {
    return this.axios
      .get<IChannel>(`/channels/${channelId}`)
      .then((res) => res.data);
  }

  renameChannel(channelId: number, name: string) {
    return this.axios
      .post<IChannel>(`/channels/${channelId}/rename`, { name })
      .then((res) => res.data);
  }

  deleteChannel(channelId: number) {
    return this.axios
      .delete<{ channelId: number }>(`/channels/${channelId}`)
      .then((res) => res.data);
  }

  createGroupChannel(
    workspaceId: number,
    data: Omit<CreateGroupChannel, "type">,
  ) {
    return this.axios
      .post<IChannel>(`/workspaces/${workspaceId}/channels/group`, data)
      .then((res) => res.data);
  }

  createDirectChannel(
    workspaceId: number,
    data: Omit<CreateDirectChannel, "type">,
  ) {
    return this.axios
      .post<IChannel>(`/workspaces/${workspaceId}/channels/direct`, data)
      .then((res) => res.data);
  }

  createDirectOrMultiDirectChannel(
    workspaceId: number,
    data: Omit<CreateDirectOrMultiDirectChannel, "type">,
  ) {
    return this.axios
      .post<IChannel>(`/workspaces/${workspaceId}/channels/multi-direct`, data)
      .then((res) => res.data);
  }

  createMeetingChannel(
    workspaceId: number,
    data: Omit<CreateMeetingChannel, "type">,
  ) {
    return this.axios
      .post<IChannel>(`/workspaces/${workspaceId}/channels/meeting`, data)
      .then((res) => res.data);
  }

  findMembers(channelId: number) {
    return this.axios
      .get<IUser[]>(`/channels/${channelId}/members`)
      .then((res) => res.data);
  }

  addMember(channelId: number, userId: number) {
    return this.axios
      .post(`/channels/${channelId}/members`, { userId })
      .then((res) => res.data);
  }

  removeMember(channelId: number, userId: number) {
    return this.axios
      .delete(`/channels/${channelId}/members/${userId}`)
      .then((res) => res.data);
  }

  findMessages(channelId: number) {
    return this.axios
      .get<IMessage[]>(`/channels/${channelId}/messages`)
      .then((res) => res.data);
  }

  sendMessage(
    channelId: number,
    content: JSONContent,
    quotedMessageId?: number | null,
    attachmentIds?: number[],
    poll?: MessagePollBody,
  ) {
    return this.axios
      .post<SendChannelMessageResponse>(`channels/${channelId}/messages`, {
        content,
        ...(quotedMessageId != null ? { quotedMessageId } : {}),
        ...(attachmentIds != null && attachmentIds.length > 0
          ? { attachmentIds }
          : {}),
        ...(poll ? { poll } : {}),
      })
      .then((res) => res.data);
  }

  getScheduledMessages(channelId: number) {
    return this.axios
      .get<IScheduledMessage[]>(`/channels/${channelId}/scheduled-messages`)
      .then((res) => res.data);
  }

  postScheduledMessage(channelId: number, body: CreateScheduledMessageBody) {
    return this.axios
      .post<IScheduledMessage>(
        `/channels/${channelId}/scheduled-messages`,
        body,
      )
      .then((res) => res.data);
  }

  patchScheduledMessage(
    channelId: number,
    scheduledMessageId: string,
    body: UpdateScheduledMessageBody,
  ) {
    return this.axios
      .patch<IScheduledMessage>(
        `/channels/${channelId}/scheduled-messages/${scheduledMessageId}`,
        body,
      )
      .then((res) => res.data);
  }

  deleteScheduledMessage(channelId: number, scheduledMessageId: string) {
    return this.axios
      .delete<{
        success: boolean;
      }>(`/channels/${channelId}/scheduled-messages/${scheduledMessageId}`)
      .then((res) => res.data);
  }

  sendDirectMessage(
    workspaceId: number,
    senderId: number,
    peers: number[],
    content: JSONContent,
  ) {
    return this.axios
      .post<SendChannelMessageResponse>(
        `workspaces/${workspaceId}/channels/direct/message`,
        {
          senderId,
          peers,
          content,
        },
      )
      .then((res) => res.data);
  }

  deleteMessage(messageId: number) {
    return this.axios.delete(`/messages/${messageId}`).then((res) => res.data);
  }

  updateMessage(messageId: number, body: UpdateChannelMessageBody) {
    return this.axios
      .patch<IMessage>(`/messages/${messageId}`, body)
      .then((res) => res.data);
  }

  updateReply(
    replyId: number,
    body: { content: JSONContent; attachmentIds?: number[] },
  ) {
    return this.axios
      .patch<IReply>(`/replies/${replyId}`, body)
      .then((res) => res.data);
  }

  findReactions(messageId: number) {
    return this.axios
      .get<IReaction[]>(`/messages/${messageId}/reactions`)
      .then((res) => res.data);
  }

  toggleMessageReaction(messageId: number, emoji: string) {
    return this.axios
      .post<ToggleReactionResponse>(`/messages/${messageId}/reactions`, {
        emoji,
      })
      .then((res) => res.data);
  }

  voteMessagePoll(messageId: number, optionId: string) {
    return this.axios
      .post<VoteMessagePollResponse>(`/messages/${messageId}/poll/vote`, {
        optionId,
      })
      .then((res) => res.data);
  }

  findReplies(messageId: number, params?: FindMessageReplies) {
    const query =
      params == null
        ? undefined
        : Object.fromEntries(
            Object.entries(params).filter(
              ([, v]) => v !== undefined && v !== null,
            ),
          );
    return this.axios
      .get<Page<IReply>>(`/messages/${messageId}/replies`, {
        ...(Object.keys(query ?? {}).length > 0 ? { params: query } : {}),
      })
      .then((res) => res.data);
  }

  replyMessage(
    messageId: number,
    content: JSONContent,
    quotedReplyId?: number | null,
    attachmentIds?: number[],
  ) {
    return this.axios
      .post<IReply>(`/messages/${messageId}/replies`, {
        content,
        ...(quotedReplyId != null ? { quotedReplyId } : {}),
        ...(attachmentIds != null && attachmentIds.length > 0
          ? { attachmentIds }
          : {}),
      })
      .then((res) => res.data);
  }

  deleteReply(replyId: number) {
    return this.axios.delete(`/replies/${replyId}`).then((res) => res.data);
  }

  listChannelAttachments(channelId: number) {
    return this.axios
      .get<UploadedAttachment[]>(`/channels/${channelId}/attachments`)
      .then((res) => res.data);
  }

  findReplyReactions(replyId: number) {
    return this.axios
      .get<IReaction[]>(`/replies/${replyId}/reactions`)
      .then((res) => res.data);
  }

  toggleReplyReaction(replyId: number, emoji: string) {
    return this.axios
      .post<ToggleReactionResponse>(`/replies/${replyId}/reactions`, { emoji })
      .then((res) => res.data);
  }

  uploadAttachment(channelId: number, file: File) {
    const form = new FormData();
    form.append("file", file);
    return this.axios
      .post<UploadedAttachment>(`/channels/${channelId}/attachments`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => res.data);
  }

  deleteChannelAttachment(channelId: number, attachmentId: number) {
    return this.axios
      .delete(`/channels/${channelId}/attachments/${attachmentId}`)
      .then((res) => res.data);
  }

  findChannelActivities(channelId: number, params?: FindChannelActivities) {
    const query =
      params == null
        ? undefined
        : Object.fromEntries(
            Object.entries(params).filter(
              ([, v]) => v !== undefined && v !== null,
            ),
          );
    return this.axios
      .get<Page<IChannelActivity>>(`/channels/${channelId}/activities`, {
        ...(Object.keys(query ?? {}).length > 0 ? { params: query } : {}),
      })
      .then((res) => res.data);
  }
}
