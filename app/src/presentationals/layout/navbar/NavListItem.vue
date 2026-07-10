<script lang="ts" setup>
import { Badge, Button, NavTrigger } from "@/design-system";
import { useNavTrigger } from "@/design-system/ui/nav-view/nav-view";
import { cn } from "@/design-system/utils";
import { computed } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { RouterLink, useRoute, useRouter } from "vue-router";

const props = defineProps<{
  /** Unread / unseen count; shown when greater than zero. */
  badgeCount?: number;
  view?: string;
  content?: string;
  /** Passed through to NavTrigger when opening a pane (e.g. `{ teamId }`). */
  contentProps?: Record<string, unknown>;
  to?: RouteLocationRaw;
}>();

const route = useRoute();
const router = useRouter();
const { content: currentContent } = useNavTrigger(props.view ?? "navbar");

const isNavTrigger = computed(() => props.view != null && props.content != null);
const isRouterLink = computed(() => props.to != null);

const active = computed(() => {
  if (isRouterLink.value && props.to) {
    try {
      const resolved = router.resolve(props.to);
      return route.path === resolved.path;
    } catch {
      return false;
    }
  }
  if (isNavTrigger.value) {
    return props.content === currentContent.value;
  }
  return false;
});
</script>

<template>
  <NavTrigger
    v-if="isNavTrigger"
    :as="Button"
    :view="props.view!"
    :content="props.content!"
    :props="props.contentProps"
    size="sm"
    :variant="active ? 'soft' : 'ghost'"
    :class="cn('justify-start gap-0')"
  >
    <span class="flex flex-1 min-w-0 items-center gap-2">
      <slot />
    </span>
    <Badge
      v-if="badgeCount != null && badgeCount > 0"
      variant="flat"
      intent="default"
      size="xs"
      class="justify-center rounded-full tabular-nums font-semibold leading-none shadow-none"
      :class="{ 'w-6': badgeCount > 99 }"
    >
      {{ badgeCount > 99 ? "99+" : badgeCount }}
    </Badge>
  </NavTrigger>
  <Button
    v-else-if="isRouterLink"
    :as="RouterLink"
    :to="props.to!"
    size="sm"
    :variant="active ? 'soft' : 'ghost'"
    :class="cn('justify-start gap-0')"
  >
    <span class="flex flex-1 min-w-0 items-center gap-2">
      <slot />
    </span>
    <Badge
      v-if="badgeCount != null && badgeCount > 0"
      variant="flat"
      intent="destructive"
      size="xs"
      class="shrink-0 justify-center rounded-full tabular-nums font-semibold leading-none shadow-none"
      :class="{ 'w-6': badgeCount > 99 }"
    >
      {{ badgeCount > 99 ? "99+" : badgeCount }}
    </Badge>
  </Button>
</template>
