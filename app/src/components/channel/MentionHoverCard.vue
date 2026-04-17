<script lang="ts" setup>
import { UserAvatar } from "@/components/user";
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
        <UserAvatar
          :name="props.user.name"
          :picture="props.user.picture"
          size="lg"
          class="flex-shrink-0"
        />
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
