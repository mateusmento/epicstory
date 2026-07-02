<script lang="ts" setup>
import { Badge, Button, NavTrigger } from "@/design-system";
import { useNavTrigger } from "@/design-system/ui/nav-view/nav-view";
import { cn } from "@/design-system/utils";
import { computed, ref } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { RouterLink, useRoute, useRouter } from "vue-router";

const props = defineProps<
  {
    /** Unread / unseen count; shown when greater than zero. */
    badgeCount?: number;
  } & (
    | {
        view: string;
        content: string;
      }
    | {
        to: RouteLocationRaw;
      }
  )
>();

const route = useRoute();
const router = useRouter();
const { content: currentContent } = "view" in props ? useNavTrigger(props.view) : { content: ref(null) };

// If 'to' is provided, use RouterLink and check route match
// Otherwise, use NavTrigger and check content match
const active = computed(() => {
  if ("to" in props && props.to) {
    // For RouterLink, check if current route matches
    try {
      const resolved = router.resolve(props.to);
      return route.path === resolved.path;
    } catch {
      return false;
    }
  }
  return "content" in props && props.content === currentContent.value;
});
</script>

<template>
  <NavTrigger
    v-if="'view' in props && props.view && 'to' in props && !props.to"
    :as="Button"
    :view="props.view"
    :content="props.content"
    size="sm"
    :variant="active ? 'soft' : 'ghost'"
    :class="cn('w-full justify-start gap-0')"
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
    v-else-if="'to' in props && props.to"
    :as="RouterLink"
    :to="props.to"
    size="sm"
    :variant="active ? 'soft' : 'ghost'"
    :class="cn('w-full justify-start gap-0')"
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
