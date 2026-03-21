<script setup lang="ts">
import { Button, MenuInput, MenuItem, MenuSeparator, ScrollArea } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useUsers } from "@/domain/user";
import { computed, ref, watch } from "vue";

type Assignee = { id: number; name: string; picture: string };

const props = defineProps<{
  assignees: Assignee[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "add", userId: number): void;
  (e: "remove", userId: number): void;
}>();

const sortedAssignees = computed(() =>
  [...(props.assignees ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
);

const query = ref("");
const { users, fetchUsersByName, fetchMoreUsersByName, hasMoreUsers, isFetchingMoreUsers } = useUsers();

watch(query, () => fetchUsersByName(query.value), { immediate: true });

const filteredUsers = computed(() => {
  return users.value.filter((u) => !props.assignees.some((a) => a.id === u.id));
});

async function fetchMoreUsers() {
  if (props.disabled) return;
  await fetchMoreUsersByName();
}
</script>

<template>
  <div>
    <MenuInput v-model="query" placeholder="Search assignees…" auto-focus />

    <MenuSeparator />

    <div class="px-2 py-1 text-[11px] text-muted-foreground">Assignees</div>

    <div v-if="assignees.length === 0" class="px-2 py-2 text-sm text-muted-foreground">No assignees</div>

    <div v-else class="max-h-44 overflow-auto">
      <MenuItem v-for="a in sortedAssignees" :key="a.id" class="flex:row-md flex:center-y text-sm">
        <img :src="a.picture" class="h-5 w-5 rounded-full" :title="a.name" />
        <div class="flex-1 truncate">{{ a.name }}</div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          :disabled="disabled"
          title="Remove assignee"
          @click.stop="emit('remove', a.id)"
          @pointerdown.stop
        >
          <Icon name="io-close" class="h-4 w-4" />
        </Button>
      </MenuItem>
    </div>

    <MenuSeparator />

    <ScrollArea class="h-40 min-h-0" @reached-bottom="fetchMoreUsers">
      <div class="!block">
        <MenuItem
          v-for="user of filteredUsers"
          :key="user.id"
          class="flex:row-lg flex:center-y"
          :disabled="disabled"
          @select="
            $event.preventDefault(); // prevent the menu from closing
            !disabled && emit('add', user.id);
          "
        >
          <img :src="user.picture" class="w-5 h-5 rounded-full" :title="user.name" />
          <div class="flex-1 truncate">{{ user.name }}</div>
        </MenuItem>
        <div v-if="isFetchingMoreUsers" class="ml-2 my-2 text-xs text-muted-foreground">Loading…</div>
        <div v-else-if="filteredUsers.length === 0" class="ml-2 my-2 text-xs text-muted-foreground">
          No users found
        </div>
        <div v-else-if="!hasMoreUsers" class="ml-2 my-2 text-xs text-muted-foreground">End of results</div>
      </div>
    </ScrollArea>
  </div>
</template>
