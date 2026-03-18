<script setup lang="ts">
import { UserSelect } from "@/components/user";
import { Button } from "@/design-system";
import { Icon } from "@/design-system/icons";
import type { User } from "@/domain/user";
import { computed, ref } from "vue";

type Assignee = { id: number; name: string; picture: string };

const props = defineProps<{
  assignees: Assignee[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "add", userId: number): void;
  (e: "remove", userId: number): void;
}>();

const selectedUser = ref<User | undefined>();

const sorted = computed(() => [...(props.assignees ?? [])].sort((a, b) => a.name.localeCompare(b.name)));

const query = ref("");
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return sorted.value;
  return sorted.value.filter((a) => a.name.toLowerCase().includes(q));
});
</script>

<template>
  <div class="px-1 py-1">
    <div class="px-2 py-1" @click.stop @pointerdown.stop>
      <input
        v-model="query"
        type="text"
        class="h-8 w-full rounded-md border bg-transparent px-2 text-sm outline-none"
        placeholder="Search assignees…"
      />
    </div>
    <div class="px-2 py-1 text-[11px] text-muted-foreground">Assignees</div>

    <div v-if="sorted.length === 0" class="px-2 py-2 text-sm text-muted-foreground">No assignees</div>

    <div v-else class="max-h-44 overflow-auto">
      <div
        v-for="a in filtered"
        :key="a.id"
        class="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
      >
        <img :src="a.picture" class="h-5 w-5 rounded-full" :title="a.name" />
        <div class="flex-1 truncate">{{ a.name }}</div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          class="h-7 w-7"
          :disabled="disabled"
          title="Remove assignee"
          @click="emit('remove', a.id)"
        >
          <Icon name="io-close" class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <div class="mt-1 border-t pt-2">
      <UserSelect
        v-model="selectedUser"
        @update:model-value="
          if ($event) emit('add', $event.id);
          selectedUser = undefined;
        "
      >
        <template #trigger>
          <button
            type="button"
            class="w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent text-left"
            :disabled="disabled"
          >
            <Icon name="fa-user-plus" class="h-4 w-4 text-muted-foreground" />
            <span>Add assignee…</span>
          </button>
        </template>
      </UserSelect>
    </div>
  </div>
</template>
