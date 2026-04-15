import type { IChannel } from "@/domain/channels/types";
import type { InjectionKey, Ref } from "vue";

export type ChannelContextMenuApi = {
  actionLoading: Ref<boolean>;
  openRename: (channel: IChannel) => void;
  openDelete: (channel: IChannel) => void;
  leaveChannel: (channel: IChannel) => Promise<void>;
  scheduleMeeting: (channel: IChannel) => void;
  startMeeting: (channel: IChannel) => void;
};

export const CHANNEL_CONTEXT_MENU_KEY: InjectionKey<ChannelContextMenuApi> = Symbol("channelContextMenu");
