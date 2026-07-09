<script setup lang="ts">
import { UserAvatarStack } from "@/presentationals/user";
import { Button } from "@/design-system";
import type { PropType } from "vue";

type PersonPreview = { id: number; name: string; picture?: string | null };

defineProps({
  title: { type: String, required: true },
  people: { type: Array as PropType<PersonPreview[]>, default: () => [] },
});

const emit = defineEmits<{
  (e: "join"): void;
}>();
</script>

<template>
  <div class="rounded-xl border bg-card p-2 flex:row-md flex:center-y gap-2">
    <UserAvatarStack
      v-if="people.length"
      :users="people"
      size="mdLg"
      variant="liveJoin"
      :min="2"
      :overlap-px="8"
      class="shrink-0"
    />

    <div class="min-w-0 flex-1">
      <div class="text-xs font-medium truncate">{{ title }}</div>
      <div class="text-[11px] text-secondary-foreground truncate">Live now</div>
    </div>

    <Button size="sm" class="h-8" @click="emit('join')">Join</Button>
  </div>
</template>
