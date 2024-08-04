import { InjectAxios } from "@/core/axios";
import type { Axios } from "axios";
import { injectable } from "tsyringe";
import type { IChannel } from "../types/channel.type";
import type { IMessage } from "../types";

export type CreateDirectChannel = {
  type: "direct";
  username: string;
};

export type CreateGroupChannel = {
  type: "group";
  name: string;
};

@injectable()
export class ChannelService {
  constructor(@InjectAxios() private axios: Axios) {}

  findChannels(workspaceId: number) {
    return this.axios.get<IChannel[]>(`/workspaces/${workspaceId}/channels`).then((res) => res.data);
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
}
