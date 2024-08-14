import type { IMessageGroup } from "./message-group.type";
import daianaPhoto from "@/assets/images/daiana.png";

export default {
  messageGroups: [
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
  ] satisfies IMessageGroup[],
};
