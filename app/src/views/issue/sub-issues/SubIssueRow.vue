<script setup lang="ts">
import { UserAvatarStack } from "@/components/user";
import { Button } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/design-system";
import type { Issue } from "@/domain/issues";
import { computed } from "vue";

const props = defineProps<{
  sub: Issue;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "open", issueId: number): void;
  (e: "toggle-done", sub: Issue): void;
  (e: "remove", issueId: number): void;
}>();

const labelsPreview = computed(() => (props.sub.labels ?? []).slice(0, 2));
const labelsOverflow = computed(() =>
  Math.max(0, (props.sub.labels?.length ?? 0) - labelsPreview.value.length),
);
</script>

<template>
  <div class="group flex items-center gap-2 px-3 py-2 hover:bg-zinc-50">
    <button
      type="button"
      class="w-4 h-4 rounded-full ring-1 ring-border grid place-items-center shrink-0"
      :class="sub.status === 'done' ? 'bg-indigo-600 ring-indigo-600' : 'bg-white'"
      title="Toggle done"
      :disabled="disabled"
      @click.stop="emit('toggle-done', sub)"
    >
      <Icon v-if="sub.status === 'done'" name="bi-check" class="w-full h-full text-white" />
    </button>

    <div class="min-w-0 flex-1 cursor-pointer" @click="emit('open', sub.id)">
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-xs text-muted-foreground tabular-nums shrink-0">EP-{{ sub.id }}</span>
        <span
          class="truncate text-sm"
          :class="sub.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'"
        >
          {{ sub.title }}
        </span>
      </div>
    </div>

    <!-- Right meta (Linear-like) -->
    <div class="flex min-w-0 items-center gap-2">
      <div class="flex items-center gap-1.5">
        <span
          v-for="l in labelsPreview"
          :key="l.id"
          class="inline-flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-[11px] text-muted-foreground"
          :title="l.name"
        >
          <span class="h-2 w-2 rounded-full ring-1 ring-border" :style="{ backgroundColor: l.color }" />
          <span class="max-w-24 truncate">{{ l.name }}</span>
        </span>
        <span v-if="labelsOverflow > 0" class="text-[11px] text-muted-foreground">+{{ labelsOverflow }}</span>
      </div>

      <div class="flex min-w-0 items-center">
        <UserAvatarStack
          :users="sub.assignees ?? []"
          size="md"
          :min="1"
          :overlap-px="8"
          avatar-class="border-2 border-white"
          class="min-w-0"
        />
      </div>

      <Menu>
        <MenuTrigger as-child>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            title="More"
          >
            <Icon name="bi-three-dots" class="w-4 h-4" />
          </Button>
        </MenuTrigger>
        <MenuContent align="end" class="w-44">
          <MenuItem class="text-red-600" @click="emit('remove', sub.id)"> Remove issue </MenuItem>
        </MenuContent>
      </Menu>
    </div>
  </div>
</template>
