export { default as UserProfile } from "./UserProfile.vue";
export { default as UpdateUser } from "./UpdateUser.vue";
export { default as UserSelect } from "./UserSelect.vue";
export { default as UserAvatar } from "./UserAvatar.vue";
export { default as UserAvatarStack } from "./UserAvatarStack.vue";
export { userInitialsFromName } from "./user-initials";
export type { UserAvatarStackUser } from "./user-avatar-stack.types";
export type { UserAvatarSize, UserAvatarVariant } from "./user-avatar.types";
export {
  computeVisibleStackedAvatars,
  defaultStackOverlapPx,
  userAvatarDiameterPx,
} from "./user-avatar-stack-layout";
