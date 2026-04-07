<script setup lang="ts">
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
  <div class="rounded-xl border bg-white p-2 flex:row-md flex:center-y gap-2">
    <div class="flex -space-x-2">
      <div
        v-for="p in people.slice(0, 4)"
        :key="p.id"
        class="w-6 h-6 rounded-full border-2 border-white overflow-hidden bg-gray-200 flex items-center justify-center"
        :title="p.name"
      >
        <img v-if="p.picture" :src="p.picture" class="w-full h-full object-cover" />
        <div v-else class="text-[10px] font-semibold text-gray-700">
          {{ p.name?.charAt(0)?.toUpperCase() || "?" }}
        </div>
      </div>
    </div>

    <div class="min-w-0 flex-1">
      <div class="text-xs font-medium truncate">{{ title }}</div>
      <div class="text-[11px] text-secondary-foreground truncate">Live now</div>
    </div>

    <Button size="sm" class="h-8" @click="emit('join')">Join</Button>
  </div>
</template>
