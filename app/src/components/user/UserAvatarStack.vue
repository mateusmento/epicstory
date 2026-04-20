<script lang="ts" setup>
import { useResizeObserver } from "@vueuse/core";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import UserAvatar from "./UserAvatar.vue";
import type { UserAvatarStackUser } from "./user-avatar-stack.types";
import type { UserAvatarSize, UserAvatarVariant } from "./user-avatar.types";
import {
  computeVisibleStackedAvatars,
  defaultStackOverlapPx,
  userAvatarDiameterPx,
} from "./user-avatar-stack-layout";

const props = withDefaults(
  defineProps<{
    users: UserAvatarStackUser[];
    size?: UserAvatarSize;
    variant?: UserAvatarVariant;
    /**
     * When `users.length >= min`, the stack is hidden unless at least `min` faces fit in the
     * current container width (and width &gt; 0).
     */
    min?: number;
    /** Override measured diameter when avatars use custom `class` sizing. */
    itemWidthPx?: number;
    overlapPx?: number;
    overflowBadgeWidthPx?: number;
    /** Passed to each `UserAvatar` (stack overlap / border). */
    avatarClass?: string;
  }>(),
  {
    size: "md",
    variant: "default",
    min: 1,
    avatarClass: "",
  },
);

const containerEl = ref<HTMLElement | null>(null);
const containerWidth = ref(0);

function readWidth() {
  const el = containerEl.value;
  containerWidth.value = el?.getBoundingClientRect().width ?? 0;
}

useResizeObserver(containerEl, (entries) => {
  const w = entries[0]?.contentRect.width ?? 0;
  containerWidth.value = w;
});

onMounted(() => {
  nextTick(() => {
    readWidth();
    requestAnimationFrame(() => readWidth());
  });
});

watch(
  () => props.users.length,
  () => nextTick(() => readWidth()),
);

const itemW = computed(() => props.itemWidthPx ?? userAvatarDiameterPx(props.size));
const overlap = computed(() => props.overlapPx ?? defaultStackOverlapPx(props.size));
const badgeW = computed(() => props.overflowBadgeWidthPx ?? itemW.value);

const visibleCount = computed(() =>
  computeVisibleStackedAvatars({
    containerWidth: containerWidth.value,
    total: props.users.length,
    itemWidthPx: itemW.value,
    overlapPx: overlap.value,
    overflowBadgeWidthPx: badgeW.value,
    min: props.min,
  }),
);

const visibleUsers = computed(() => props.users.slice(0, visibleCount.value));
const overflowTotal = computed(() => Math.max(0, props.users.length - visibleCount.value));

const showStack = computed(() => visibleCount.value > 0);

function stackOffsetStyle(index: number) {
  if (index === 0) return undefined;
  return { marginLeft: `-${overlap.value}px` };
}

const overflowBadgeStyle = computed(() => ({
  width: `${badgeW.value}px`,
  height: `${badgeW.value}px`,
  minWidth: `${badgeW.value}px`,
  marginLeft: `-${overlap.value}px`,
  fontSize: badgeW.value <= 20 ? "9px" : "10px",
}));
</script>

<template>
  <div ref="containerEl" class="flex min-h-0 min-w-0 items-center overflow-hidden self-stretch">
    <template v-if="showStack">
      <UserAvatar
        v-for="(u, i) in visibleUsers"
        :key="u.id"
        :name="u.name"
        :picture="u.picture"
        :size="size"
        :variant="variant"
        :title="u.name"
        :class="avatarClass"
        :style="stackOffsetStyle(i)"
      />
      <div
        v-if="overflowTotal > 0"
        class="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-white bg-secondary font-medium text-secondary-foreground"
        :style="overflowBadgeStyle"
        :title="`+${overflowTotal} more`"
      >
        +{{ overflowTotal }}
      </div>
    </template>
  </div>
</template>
