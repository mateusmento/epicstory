<script lang="ts" setup>
import { Button, NavTrigger } from "@/design-system";
import { useNavTrigger } from "@/design-system/ui/nav-view/nav-view";
import { cn } from "@/design-system/utils";
import { computed } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import type { RouteLocationRaw } from "vue-router";

const props = defineProps<{
  view: string;
  content: string;
  to?: RouteLocationRaw;
}>();

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
    v-bind="props"
    size="sm"
    variant="ghost"
    :class="cn('justify-start', { 'bg-secondary': active })"
  >
    <slot />
  </NavTrigger>
  <Button
    v-else
    :as="RouterLink"
    v-bind="{ ...props, to }"
    size="sm"
    variant="ghost"
    :class="cn('justify-start', { 'bg-secondary': active })"
  >
    <slot />
  </Button>
</template>
