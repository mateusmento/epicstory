<script lang="ts" setup>
import { OverflowContainer, OverflowEllipsis, OverflowItem } from "@/design-system";
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
const stride = computed(() => itemW.value - overlap.value);

const fittedCount = computed(() =>
  computeVisibleStackedAvatars({
    containerWidth: containerWidth.value,
    total: props.users.length,
    itemWidthPx: itemW.value,
    overlapPx: overlap.value,
    overflowBadgeWidthPx: badgeW.value,
    min: props.min,
  }),
);

const showStack = computed(() => fittedCount.value > 0);

function segmentMeasureStyle(index: number) {
  const w = index === 0 ? itemW.value : stride.value;
  return {
    width: `${w}px`,
    minWidth: `${w}px`,
  };
}

function stackOffsetStyle(index: number) {
  if (index === 0) return undefined;
  return { marginLeft: `-${overlap.value}px` };
}

const overflowEllipsisStyle = computed(() => ({
  marginLeft: `-${overlap.value}px`,
}));

const overflowBadgeStyle = computed(() => ({
  width: `${badgeW.value}px`,
  height: `${badgeW.value}px`,
  minWidth: `${badgeW.value}px`,
  fontSize: badgeW.value <= 20 ? "9px" : "10px",
}));
</script>

<template>
  <div ref="containerEl" class="flex min-h-0 min-w-0 items-center overflow-hidden self-stretch">
    <OverflowContainer v-if="showStack" :gap="0" class="min-h-0 min-w-0 self-stretch">
      <OverflowItem v-for="(u, i) in users" :key="u.id" :style="stackOffsetStyle(i)">
        <div
          class="flex shrink-0 items-center justify-center overflow-visible"
          :style="segmentMeasureStyle(i)"
        >
          <UserAvatar
            :name="u.name"
            :picture="u.picture"
            :size="size"
            :variant="variant"
            :title="u.name"
            :class="avatarClass"
          />
        </div>
      </OverflowItem>
      <OverflowEllipsis :style="overflowEllipsisStyle">
        <template #default="{ hiddenCount, collapsed }">
          <div
            v-if="collapsed"
            class="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-white bg-secondary font-medium text-secondary-foreground"
            :style="overflowBadgeStyle"
            :title="`+${hiddenCount} more`"
          >
            +{{ hiddenCount }}
          </div>
        </template>
      </OverflowEllipsis>
    </OverflowContainer>
  </div>
</template>
