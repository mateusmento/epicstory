import daianaPhoto from "@/assets/images/daiana.png";
import seanPhoto from "@/assets/images/sean.png";
import type { IMessageGroup } from "@/domain/channels";
import { ref } from "vue";

export const messageGroup = ref<IMessageGroup>({
  id: 2,
  senderId: 2,
  sender: {
    id: 2,
    name: "Jean",
    picture: seanPhoto,
    email: "jean@example.com",
  },
  sentAt: new Date().toISOString(),
  messages: [
    {
      id: 3,
      content: "Yeah, I'll send you the updates later.",
      sentAt: new Date().toISOString(),
      senderId: 2,
      sender: {
        id: 2,
        name: "Jean",
        picture: seanPhoto,
        email: "jean@example.com",
      },
      channelId: 1,
      channel: {
        id: 1,
        name: "Channel 1",
        type: "direct",
        speakingTo: { id: 1, name: "Daiana", picture: daianaPhoto, email: "daiana@example.com" },
        lastMessage: {
          id: 1,
          content: "Hello there!",
          sentAt: new Date().toISOString(),
          senderId: 1,
          sender: {
            id: 1,
            name: "Daiana",
            picture: daianaPhoto,
            email: "daiana@example.com",
          },
          channelId: 1,
          channel: {
            id: 1,
            name: "Channel 1",
            type: "direct",
            speakingTo: { id: 1, name: "Daiana", picture: daianaPhoto, email: "daiana@example.com" },
            unreadMessagesCount: 0,
            meeting: null,
            peers: [],
          },
          repliesCount: 0,
          repliers: [],
          reactions: [],
        },
        unreadMessagesCount: 0,
        meeting: null,
        peers: [
          { id: 1, name: "Daiana", picture: daianaPhoto, email: "daiana@example.com" },
          { id: 2, name: "Jean", picture: seanPhoto, email: "jean@example.com" },
        ],
      },
      repliesCount: 0,
      repliers: [],
      reactions: [],
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
      email: "daiana@example.com",
    },
    sentAt: "2024-07-23T21:07:30",
    messages: [
      {
        id: 1,
        content: "Hello there!",
        sentAt: new Date().toISOString(),
        senderId: 1,
        sender: {
          id: 1,
          name: "Daiana",
          picture: daianaPhoto,
          email: "daiana@example.com",
        },
        channelId: 1,
        channel: {
          id: 1,
          name: "Channel 1",
          type: "direct",
          speakingTo: { id: 1, name: "Daiana", picture: daianaPhoto, email: "daiana@example.com" },
          unreadMessagesCount: 0,
          meeting: null,
          peers: [],
        },
        repliesCount: 0,
        repliers: [],
        reactions: [],
      },
      {
        id: 2,
        content: "Any updates?",
        sentAt: new Date().toISOString(),
        senderId: 1,
        sender: {
          id: 1,
          name: "Daiana",
          picture: daianaPhoto,
          email: "daiana@example.com",
        },
        channelId: 1,
        channel: {
          id: 1,
          name: "Channel 1",
          type: "direct",
          speakingTo: { id: 1, name: "Daiana", picture: daianaPhoto, email: "daiana@example.com" },
          unreadMessagesCount: 0,
          meeting: null,
          peers: [],
        },
        repliesCount: 0,
        repliers: [],
        reactions: [],
      },
    ],
  },
  messageGroup.value,
]);

export default {
  messageGroups,
};
