<script lang="ts" setup>
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/design-system";
import type { User } from "@/domain/auth";

const props = withDefaults(
  defineProps<{
    user?: User;
    raw: string;
    openDelay?: number;
    closeDelay?: number;
    contentClass?: string;
  }>(),
  {
    openDelay: 100,
    closeDelay: 0,
    contentClass: "w-64",
  },
);
</script>

<template>
  <HoverCard :open-delay="props.openDelay" :close-delay="props.closeDelay">
    <HoverCardTrigger as-child>
      <slot />
    </HoverCardTrigger>

    <HoverCardContent :class="props.contentClass">
      <div v-if="props.user" class="flex:row-md items-center">
        <img
          v-if="props.user.picture"
          :src="props.user.picture"
          :alt="props.user.name"
          class="w-10 h-10 rounded-full flex-shrink-0"
        />
        <div
          v-else
          class="w-10 h-10 rounded-full bg-zinc-300 flex items-center justify-center text-zinc-600 font-semibold"
        >
          {{ props.user.name.charAt(0).toUpperCase() }}
        </div>
        <div class="flex:col min-w-0">
          <div class="text-sm font-semibold text-foreground truncate">
            {{ props.user.name }}
          </div>
          <div class="text-xs text-secondary-foreground font-dmSans truncate">
            {{ props.user.email }}
          </div>
        </div>
      </div>

      <div v-else class="text-sm text-secondary-foreground font-dmSans">Unknown user {{ props.raw }}</div>
    </HoverCardContent>
  </HoverCard>
</template>
