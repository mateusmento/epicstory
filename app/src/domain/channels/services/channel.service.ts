import { InjectAxios } from "@/core/axios";
import type { Axios } from "axios";
import { injectable } from "tsyringe";
import type { Page } from "@/core/types";
import type { ChannelGroupsPage, IChannel, ISearchChannelsAndUsersItem } from "../types/channel.type";
import type { IMessage, IReaction, IReply } from "../types";
import type { User } from "@/domain/auth";

export type CreateDirectChannel = {
  type: "direct";
  username: string;
};

export type CreateDirectOrMultiDirectChannel = {
  type: "direct";
  peers: number[];
};

export type CreateGroupChannel = {
  type: "group";
  name: string;
  members?: number[];
};

export type CreateMeetingChannel = {
  type: "meeting";
  name: string;
  members?: number[];
};

export type UploadedAttachment = {
  id: number;
  url: string;
  mimeType: string;
  originalFilename: string;
  byteSize: number;
};

@injectable()
export class ChannelApi {
  constructor(@InjectAxios() private axios: Axios) {}

  findChannels(workspaceId: number) {
    return this.axios.get<IChannel[]>(`/workspaces/${workspaceId}/channels`).then((res) => res.data);
  }

  searchChannelsAndUsers(workspaceId: number, params: { q?: string; page?: number; count?: number }) {
    return this.axios
      .get<Page<ISearchChannelsAndUsersItem>>(`/workspaces/${workspaceId}/channels/search`, { params })
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
    return this.axios.get<IChannel>(`/channels/${channelId}`).then((res) => res.data);
  }

  renameChannel(channelId: number, name: string) {
    return this.axios.post<IChannel>(`/channels/${channelId}/rename`, { name }).then((res) => res.data);
  }

  deleteChannel(channelId: number) {
    return this.axios.delete<{ channelId: number }>(`/channels/${channelId}`).then((res) => res.data);
  }

  createGroupChannel(workspaceId: number, data: Omit<CreateGroupChannel, "type">) {
    return this.axios
      .post<IChannel>(`/workspaces/${workspaceId}/channels/group`, data)
      .then((res) => res.data);
  }

  createDirectChannel(workspaceId: number, data: Omit<CreateDirectChannel, "type">) {
    return this.axios
      .post<IChannel>(`/workspaces/${workspaceId}/channels/direct`, data)
      .then((res) => res.data);
  }

  createDirectOrMultiDirectChannel(
    workspaceId: number,
    data: Omit<CreateDirectOrMultiDirectChannel, "type">,
  ) {
    return this.axios
      .post<IChannel>(`/workspaces/${workspaceId}/channels/direct/peers`, data)
      .then((res) => res.data);
  }

  createMeetingChannel(workspaceId: number, data: Omit<CreateMeetingChannel, "type">) {
    return this.axios
      .post<IChannel>(`/workspaces/${workspaceId}/channels/meeting`, data)
      .then((res) => res.data);
  }

  findMembers(channelId: number) {
    return this.axios.get<User[]>(`/channels/${channelId}/members`).then((res) => res.data);
  }

  addMember(channelId: number, userId: number) {
    return this.axios.post(`/channels/${channelId}/members`, { userId }).then((res) => res.data);
  }

  removeMember(channelId: number, userId: number) {
    return this.axios.delete(`/channels/${channelId}/members/${userId}`).then((res) => res.data);
  }

  findMessages(channelId: number) {
    return this.axios.get<IMessage[]>(`/channels/${channelId}/messages`).then((res) => res.data);
  }

  sendMessage(channelId: number, content: string, contentRich?: any, quotedMessageId?: number | null) {
    return this.axios
      .post<IMessage>(`channels/${channelId}/messages`, {
        content,
        contentRich,
        ...(quotedMessageId != null ? { quotedMessageId } : {}),
      })
      .then((res) => res.data);
  }

  sendDirectMessage(workspaceId: number, senderId: number, peers: number[], content: string) {
    return this.axios
      .post<IMessage>(`workspaces/${workspaceId}/channels/direct/message`, { senderId, peers, content })
      .then((res) => res.data);
  }

  deleteMessage(messageId: number) {
    return this.axios.delete(`/messages/${messageId}`).then((res) => res.data);
  }

  updateMessage(messageId: number, body: { content: string; contentRich?: any }) {
    return this.axios.patch<IMessage>(`/messages/${messageId}`, body).then((res) => res.data);
  }

  findReactions(messageId: number) {
    return this.axios.get<IReaction[]>(`/messages/${messageId}/reactions`).then((res) => res.data);
  }

  toggleMessageReaction(messageId: number, emoji: string) {
    return this.axios.post(`/messages/${messageId}/reactions`, { emoji }).then((res) => res.data);
  }

  findReplies(messageId: number) {
    return this.axios.get<IReply[]>(`/messages/${messageId}/replies`).then((res) => res.data);
  }

  replyMessage(messageId: number, content: string, contentRich?: any, quotedMessageId?: number | null) {
    return this.axios
      .post<IReply>(`/messages/${messageId}/replies`, {
        content,
        contentRich,
        ...(quotedMessageId != null ? { quotedMessageId } : {}),
      })
      .then((res) => res.data);
  }

  deleteReply(replyId: number) {
    return this.axios.delete(`/replies/${replyId}`).then((res) => res.data);
  }

  findReplyReactions(replyId: number) {
    return this.axios.get<IReaction[]>(`/replies/${replyId}/reactions`).then((res) => res.data);
  }

  toggleReplyReaction(replyId: number, emoji: string) {
    return this.axios.post(`/replies/${replyId}/reactions`, { emoji }).then((res) => res.data);
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
}
