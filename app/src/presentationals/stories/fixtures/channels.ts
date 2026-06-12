import { storyUsers } from "./users";

export const storyDirectChannel = {
  id: 1,
  name: "Daiana",
  type: "direct" as const,
  workspaceId: 1,
  createdAt: new Date(),
  directPeer: storyUsers.daiana,
  unreadMessagesCount: 0,
  meeting: null,
  peers: [storyUsers.daiana, storyUsers.jean],
};
