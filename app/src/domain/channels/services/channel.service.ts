import { InjectAxios } from "@/core/axios";
import type { Axios } from "axios";
import { injectable } from "tsyringe";
import type { IChannel } from "../types/channel.type";
import type { IMessage, IReaction, IReply } from "../types";
import type { User } from "@/domain/auth";

export type CreateDirectChannel = {
  type: "direct";
  username: string;
};

export type CreateGroupChannel = {
  type: "group";
  name: string;
};

@injectable()
export class ChannelApi {
  constructor(@InjectAxios() private axios: Axios) {}

  findChannels(workspaceId: number) {
    return this.axios.get<IChannel[]>(`/workspaces/${workspaceId}/channels`).then((res) => res.data);
  }

  findChannel(channelId: number) {
    return this.axios.get<IChannel>(`/channels/${channelId}`).then((res) => res.data);
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

  sendMessage(channelId: number, content: string, contentRich?: any) {
    return this.axios
      .post<IMessage>(`channels/${channelId}/messages`, { content, contentRich })
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

  findReactions(messageId: number) {
    return this.axios.get<IReaction[]>(`/messages/${messageId}/reactions`).then((res) => res.data);
  }

  toggleMessageReaction(messageId: number, emoji: string) {
    return this.axios.post(`/messages/${messageId}/reactions`, { emoji }).then((res) => res.data);
  }

  findReplies(messageId: number) {
    return this.axios.get<IReply[]>(`/messages/${messageId}/replies`).then((res) => res.data);
  }

  replyMessage(messageId: number, content: string, contentRich?: any) {
    return this.axios
      .post<IReply>(`/messages/${messageId}/replies`, { content, contentRich })
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
}
