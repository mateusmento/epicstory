<script lang="ts" setup>
import { OverflowContainer, OverflowEllipsis, OverflowItem, type OverflowMode } from "@/design-system";
import { computed } from "vue";
import UserAvatar from "./UserAvatar.vue";
import type { UserAvatarStackUser } from "./user-avatar-stack.types";
import type { UserAvatarSize, UserAvatarVariant } from "./user-avatar.types";
import { defaultStackOverlapPx, userAvatarDiameterPx } from "./user-avatar-stack-layout";

const props = withDefaults(
  defineProps<{
    users: UserAvatarStackUser[];
    size?: UserAvatarSize;
    variant?: UserAvatarVariant;
    min?: number;
    itemWidthPx?: number;
    overlapPx?: number;
    overflowBadgeWidthPx?: number;
    avatarClass?: string;
    center?: boolean;
    mode?: OverflowMode;
  }>(),
  {
    size: "md",
    variant: "default",
    min: 1,
    avatarClass: "",
    center: false,
  },
);

const overflowMode = computed<OverflowMode>(() => {
  if (props.mode) return props.mode;
  return props.center ? "fill" : "auto";
});

const containerClass = computed(() => {
  if (props.center || overflowMode.value === "fill") {
    return "min-h-0 min-w-0 w-full self-stretch justify-center";
  }
  return "w-fit shrink-0";
});

const itemW = computed(() => props.itemWidthPx ?? userAvatarDiameterPx(props.size));
const overlap = computed(() => props.overlapPx ?? defaultStackOverlapPx(props.size));
const badgeW = computed(() => props.overflowBadgeWidthPx ?? itemW.value);

const overflowBadgeStyle = computed(() => ({
  width: `${badgeW.value}px`,
  height: `${badgeW.value}px`,
  minWidth: `${badgeW.value}px`,
  fontSize: badgeW.value <= 20 ? "9px" : "10px",
}));
</script>

<template>
  <OverflowContainer
    :mode="overflowMode"
    :overlap-px="overlap"
    :min-visible-items="min"
    :gap="0"
    :class="containerClass"
  >
    <OverflowItem
      v-for="(u, i) in users"
      :key="u.id"
      :segment-width-px="itemW"
      :pinned="i < min"
      :segment-key="String(u.id)"
      class="relative"
      :style="{ zIndex: users.length - i }"
    >
      <UserAvatar
        :name="u.name"
        :picture="u.picture"
        :size="size"
        :variant="variant"
        :title="u.name"
        :class="avatarClass"
      />
    </OverflowItem>
    <OverflowEllipsis :segment-width-px="badgeW" class="relative" :style="{ zIndex: 0 }">
      <template #default="{ hiddenCount }">
        <div
          class="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-white bg-secondary font-medium text-secondary-foreground"
          :style="overflowBadgeStyle"
          :title="`+${hiddenCount} more`"
        >
          +{{ hiddenCount }}
        </div>
      </template>
    </OverflowEllipsis>
  </OverflowContainer>
</template>
