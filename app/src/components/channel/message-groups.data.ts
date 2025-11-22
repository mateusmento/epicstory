import type { IMessageGroup } from "./types";
import daianaPhoto from "@/assets/images/daiana.png";
import seanPhoto from "@/assets/images/sean.png";
import { ref } from "vue";

export const messageGroup = ref<IMessageGroup>({
  id: 2,
  senderId: 2,
  sender: {
    id: 2,
    name: "Jean",
    picture: seanPhoto,
  },
  sentAt: new Date().toISOString(),
  messages: [
    {
      id: 3,
      content: "Yeah, I'll send you the updates later.",
    },
  ],
});

export const messageGroups = ref<IMessageGroup[]>([
  {
    id: 1,
    senderId: 1,
    sender: {
      id: 1,
      name: "Daiana",
      picture: daianaPhoto,
    },
    sentAt: "2024-07-23T21:07:30",
    messages: [
      {
        id: 1,
        content: "Hello there!",
      },
      {
        id: 2,
        content: "Any updates?",
      },
    ],
  },
  messageGroup.value,
]);

export default {
  messageGroups,
};
