<script lang="ts" setup>
import { computed } from "vue";
import { cn } from "@/design-system/utils";
import { userInitialsFromName } from "./user-initials";
import type { UserAvatarSize, UserAvatarVariant } from "./user-avatar.types";

const props = withDefaults(
  defineProps<{
    name: string;
    picture?: string | null;
    size?: UserAvatarSize;
    variant?: UserAvatarVariant;
    title?: string;
    /** Extra classes on the root (e.g. stacked `-ml-3 border-2 border-white`). */
    class?: string;
    /** Extra classes on the profile image when a picture is shown. */
    imgClass?: string;
  }>(),
  {
    picture: null,
    size: "lg",
    variant: "default",
  },
);

const emit = defineEmits<{
  (e: "error"): void;
}>();

const hasPicture = computed(() => {
  const p = props.picture;
  return typeof p === "string" && p.trim().length > 0;
});

const initials = computed(() => userInitialsFromName(props.name));

const sizeClass = computed(() => {
  const map: Record<UserAvatarSize, string> = {
    xs: "w-4 h-4 min-w-4 min-h-4",
    sm: "w-5 h-5 min-w-5 min-h-5",
    md: "w-6 h-6 min-w-6 min-h-6",
    mdLg: "w-7 h-7 min-w-7 min-h-7",
    base: "w-8 h-8 min-w-8 min-h-8",
    lg: "w-10 h-10 min-w-10 min-h-10",
    xl: "w-11 h-11 min-w-11 min-h-11",
    "2xl": "w-9 h-9 min-w-9 min-h-9",
    "3xl": "w-14 h-14 min-w-14 min-h-14",
    tile: "w-16 h-16 min-w-16 min-h-16",
    tileLg: "w-20 h-20 min-w-20 min-h-20",
    tileXl: "w-32 h-32 min-w-32 min-h-32",
  };
  return map[props.size];
});

const textClass = computed(() => {
  const bySize: Record<UserAvatarSize, string> = {
    xs: "text-[9px] leading-none",
    sm: "text-[10px] leading-none",
    md: "text-xs leading-none",
    mdLg: "text-xs leading-none",
    base: "text-xs leading-none",
    lg: "text-sm leading-none",
    xl: "text-sm leading-none",
    "2xl": "text-sm leading-none",
    "3xl": "text-lg leading-none",
    tile: "text-2xl leading-none",
    tileLg: "text-2xl leading-none",
    tileXl: "text-2xl leading-none",
  };
  const base = bySize[props.size];
  if (props.variant === "mentionRow") return cn(base, "font-lato");
  if (props.variant === "meetingNavbar") return cn(base, "font-dmSans", "text-lg");
  return cn(base, "font-semibold");
});

const fallbackClass = computed(() => {
  switch (props.variant) {
    case "meetingDark":
      return "bg-muted-foreground text-background font-semibold";
    case "meetingNavbar":
      return "bg-muted text-muted-foreground";
    case "mentionRow":
      return "bg-muted text-muted-foreground";
    case "liveJoin":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
});

const rootClass = computed(() =>
  cn(
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
    sizeClass.value,
    props.variant === "liveJoin" && "border-2 border-background",
    !hasPicture.value && fallbackClass.value,
    hasPicture.value && props.variant === "liveJoin" && "bg-muted",
    props.class,
  ),
);

const ariaLabel = computed(() => props.title ?? props.name);
</script>

<template>
  <div :class="rootClass" :title="title ?? name">
    <img
      v-if="hasPicture"
      :src="picture!"
      :alt="ariaLabel"
      :class="cn('h-full w-full object-cover', imgClass)"
      @error="emit('error')"
    />
    <span v-else :class="textClass" class="w-full h-full flex items-center justify-center">{{
      initials
    }}</span>
  </div>
</template>
