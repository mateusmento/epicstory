import daianaPhoto from "@/assets/images/daiana.png";
import seanPhoto from "@/assets/images/sean.png";
import type { UserAvatarStackUser } from "@/presentationals/user/user-avatar-stack.types";
import type { IUser } from "@epicstory/contracts";

export const storyUsers = {
  sean: {
    id: 1,
    name: "Sean",
    email: "sean@gmail.com",
    picture: seanPhoto,
  },
  daiana: {
    id: 2,
    name: "Daiana",
    email: "daiana@gmail.com",
    picture: daianaPhoto,
  },
  jean: {
    id: 3,
    name: "Jean",
    email: "jean@example.com",
    picture: seanPhoto,
  },
} satisfies Record<string, IUser>;

export const storyMembers = [
  { ...storyUsers.sean, role: "admin" as const },
  { ...storyUsers.daiana, role: "member" as const, online: true },
];

export const storyStackUsers: UserAvatarStackUser[] = [storyUsers.sean, storyUsers.daiana, storyUsers.jean];
