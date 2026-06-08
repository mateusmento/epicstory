<script lang="ts" setup>
import { Badge, Button, NavTrigger } from "@/design-system";
import { useNavTrigger } from "@/design-system/ui/nav-view/nav-view";
import { cn } from "@/design-system/utils";
import { computed, toRefs } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import type { RouteLocationRaw } from "vue-router";

const props = defineProps<{
  view: string;
  content: string;
  to?: RouteLocationRaw;
  /** Unread / unseen count; shown when greater than zero. */
  badgeCount?: number;
}>();

const { view, content, to, badgeCount } = toRefs(props);

const route = useRoute();
const router = useRouter();
const { content: currentContent } = useNavTrigger(props.view);

// If 'to' is provided, use RouterLink and check route match
// Otherwise, use NavTrigger and check content match
const active = computed(() => {
  if (props.to) {
    // For RouterLink, check if current route matches
    try {
      const resolved = router.resolve(props.to);
      return route.path === resolved.path;
    } catch {
      return false;
    }
  }
  return props.content === currentContent.value;
});
</script>

<template>
  <NavTrigger
    v-if="!to"
    :as="Button"
    :view="view"
    :content="content"
    size="sm"
    variant="ghost"
    :class="cn('w-full justify-start gap-0', { 'bg-secondary': active })"
  >
    <span class="flex flex-1 min-w-0 items-center gap-2">
      <slot />
    </span>
    <Badge
      v-if="badgeCount != null && badgeCount > 0"
      size="xs"
      class="justify-center rounded-full tabular-nums font-semibold leading-none shadow-none"
      :class="{ 'w-6': badgeCount > 99 }"
    >
      {{ badgeCount > 99 ? "99+" : badgeCount }}
    </Badge>
  </NavTrigger>
  <Button
    v-else
    :as="RouterLink"
    :view="view"
    :content="content"
    :to="to!"
    size="sm"
    variant="ghost"
    :class="cn('w-full justify-start gap-0', { 'bg-secondary': active })"
  >
    <span class="flex flex-1 min-w-0 items-center gap-2">
      <slot />
    </span>
    <Badge
      v-if="badgeCount != null && badgeCount > 0"
      variant="destructive"
      size="xs"
      class="shrink-0 justify-center rounded-full tabular-nums font-semibold leading-none shadow-none"
      :class="{ 'w-6': badgeCount > 99 }"
    >
      {{ badgeCount > 99 ? "99+" : badgeCount }}
    </Badge>
  </Button>
</template>
