import type { ChannelActivityType } from "./channel-activity";

export type ChannelRenamedPayload = {
  previousName: string;
  newName: string;
};

export type ChannelActivityPayload = ChannelRenamedPayload;

export type ChannelActivityPayloadFor<T extends ChannelActivityType> =
  T extends "channel_renamed" ? ChannelRenamedPayload | null : null;
