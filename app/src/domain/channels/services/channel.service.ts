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

  findMembers(channelId: number) {
    return this.axios.get<User[]>(`/channels/${channelId}/members`).then((res) => res.data);
  }

  addMember(channelId: number, userId: number) {
    return this.axios.post(`/channels/${channelId}/members`, { userId }).then((res) => res.data);
  }

  removeMember(channelId: number, userId: number) {
    return this.axios.delete(`/channels/${channelId}/members/${userId}`).then((res) => res.data);
  }
}
