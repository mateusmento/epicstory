import { InjectAxios } from "@/core/axios";
import type { Axios } from "axios";
import { injectable } from "tsyringe";
import type { IChannel } from "../types/channel.type";
import type { IMessage } from "../types";
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

  async findMessages(channelId: number) {
    return this.axios.get<IMessage[]>(`/channels/${channelId}/messages`).then((res) => res.data);
  }

  sendMessage(channelId: number, content: string) {
    return this.axios.post<IMessage>(`channels/${channelId}/messages`, { content }).then((res) => res.data);
  }

  sendDirectMessage(workspaceId: number, senderId: number, peers: number[], content: string) {
    return this.axios
      .post<IMessage>(`workspaces/${workspaceId}/channels/direct/message`, { senderId, peers, content })
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

  findReplies(channelId: number, messageId: number) {
    return this.axios
      .get<IMessage[]>(`/channels/${channelId}/messages/${messageId}/replies`)
      .then((res) => res.data);
  }

  replyMessage(channelId: number, messageId: number, content: string) {
    return this.axios
      .post<IMessage>(`/channels/${channelId}/messages/${messageId}/replies`, { content })
      .then((res) => res.data);
  }

  findReactions(channelId: number, messageId: number) {
    return this.axios
      .get<{ emoji: string; reactedBy: number[] }[]>(`/channels/${channelId}/messages/${messageId}/reactions`)
      .then((res) => res.data);
  }

  findReplyReactions(channelId: number, messageId: number, replyId: number) {
    return this.axios
      .get<
        { emoji: string; reactedBy: number[] }[]
      >(`/channels/${channelId}/messages/${messageId}/replies/${replyId}/reactions`)
      .then((res) => res.data);
  }

  toggleReaction(channelId: number, messageId: number, emoji: string) {
    return this.axios
      .post(`/channels/${channelId}/messages/${messageId}/reactions`, { emoji })
      .then((res) => res.data);
  }

  toggleReplyReaction(channelId: number, messageId: number, replyId: number, emoji: string) {
    return this.axios
      .post(`/channels/${channelId}/messages/${messageId}/replies/${replyId}/reactions`, { emoji })
      .then((res) => res.data);
  }

  deleteMessage(channelId: number, messageId: number) {
    return this.axios.delete(`/channels/${channelId}/messages/${messageId}`).then((res) => res.data);
  }

  deleteReply(channelId: number, messageId: number, replyId: number) {
    return this.axios
      .delete(`/channels/${channelId}/messages/${messageId}/replies/${replyId}`)
      .then((res) => res.data);
  }
}
