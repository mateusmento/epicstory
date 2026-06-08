<script setup lang="ts">
import { UserAvatar } from "@/presentationals/user";
import { Button, MenuInput, MenuItem, MenuSeparator, ScrollArea } from "@/design-system";
import { Icon } from "@/design-system/icons";
import type { IUser as IUser } from "@epicstory/contracts";
import { computed, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    searchUsers: IUser[];
    isFetchingMore?: boolean;
    hasMore?: boolean;
    selectedLabel?: string;
    searchPlaceholder?: string;
  }>(),
  {
    disabled: false,
    isFetchingMore: false,
    hasMore: true,
    selectedLabel: "Members",
    searchPlaceholder: "Search workspace members…",
  },
);

const users = defineModel<IUser[]>("users", { default: () => [] });

const emit = defineEmits<{
  (e: "add", user: IUser): void;
  (e: "remove", user: IUser): void;
  (e: "search", query: string): void;
  (e: "load-more"): void;
}>();

const query = ref("");

watch(
  query,
  (value) => {
    emit("search", value);
  },
  { immediate: true },
);

const sortedUsers = computed(() => [...(users.value ?? [])].sort((a, b) => a.name.localeCompare(b.name)));

function onAdd(user: IUser) {
  if (props.disabled) return;
  if (users.value.some((u) => u.id === user.id)) return;
  users.value = [...users.value, user];
  emit("add", user);
}

function onRemove(user: IUser) {
  if (props.disabled) return;
  users.value = users.value.filter((u) => u.id !== user.id);
  emit("remove", user);
}

function onLoadMore() {
  if (props.disabled) return;
  emit("load-more");
}
</script>

<template>
  <div>
    <MenuInput v-model="query" :placeholder="searchPlaceholder" auto-focus />

    <MenuSeparator />

    <div class="px-2 py-1 text-[11px] text-muted-foreground">{{ selectedLabel }}</div>

    <div v-if="users.length === 0" class="px-2 py-2 text-sm text-muted-foreground">None selected</div>

    <div v-else class="max-h-44 overflow-auto">
      <MenuItem v-for="user in sortedUsers" :key="user.id" class="flex:row-md flex:center-y text-sm">
        <UserAvatar :name="user.name" :picture="user.picture" size="sm" :title="user.name" />
        <div class="flex-1 truncate">{{ user.name }}</div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          :disabled="disabled"
          title="Remove"
          @click.stop="onRemove(user)"
          @pointerdown.stop
        >
          <Icon name="io-close" class="h-4 w-4" />
        </Button>
      </MenuItem>
    </div>

    <MenuSeparator />

    <ScrollArea class="h-40 min-h-0" @reached-bottom="onLoadMore">
      <div class="!block">
        <MenuItem
          v-for="user of searchUsers"
          :key="user.id"
          class="flex:row-lg flex:center-y"
          :disabled="disabled"
          @select="
            ($event) => {
              $event.preventDefault();
              onAdd(user);
            }
          "
        >
          <UserAvatar :name="user.name" :picture="user.picture" size="sm" :title="user.name" />
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm">{{ user.name }}</div>
            <div v-if="user.email" class="truncate text-xs text-muted-foreground">{{ user.email }}</div>
          </div>
        </MenuItem>
        <div v-if="isFetchingMore" class="ml-2 my-2 text-xs text-muted-foreground">Loading…</div>
        <div v-else-if="searchUsers.length === 0" class="ml-2 my-2 text-xs text-muted-foreground">
          No members found
        </div>
        <div v-else-if="!hasMore" class="ml-2 my-2 text-xs text-muted-foreground">End of results</div>
      </div>
    </ScrollArea>
  </div>
</template>
