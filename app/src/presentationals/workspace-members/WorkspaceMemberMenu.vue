<script setup lang="ts">
import { Button, MenuInput, MenuItem, MenuSeparator, ScrollArea } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { emptyPaginatedListView, type PaginatedListView } from "@/lib/async";
import { UserAvatar } from "@/presentationals/user";
import type { IUser, WorkspaceMember } from "@epicstory/contracts";
import { Check, X } from "lucide-vue-next";
import { computed, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    list?: PaginatedListView<WorkspaceMember>;
    excludeUserIds?: number[];
    selectedLabel?: string;
    searchPlaceholder?: string;
    /** Tighter rows (hide email) for chip-row menus. */
    density?: "default" | "compact";
    /** When set, show Assign me if this user is not excluded. */
    currentUserId?: number;
    /** Hydrates Assign me when the user is not yet in the loaded catalog page. */
    currentUser?: IUser | null;
  }>(),
  {
    disabled: false,
    list: () => emptyPaginatedListView<WorkspaceMember>(),
    excludeUserIds: () => [],
    selectedLabel: "Members",
    searchPlaceholder: "Search workspace members…",
    density: "default",
    currentUser: null,
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
const isCompact = computed(() => props.density === "compact");

watch(
  query,
  (value) => {
    emit("search", value);
  },
  { immediate: true },
);

const selectedIds = computed(() => new Set((users.value ?? []).map((u) => u.id)));

const excludeIds = computed(() => new Set(props.excludeUserIds));

const sectionLabel = computed(() => {
  const n = (users.value ?? []).filter((u) => !excludeIds.value.has(u.id)).length;
  if (n === 0) return props.selectedLabel;
  return `${props.selectedLabel} · ${n}`;
});

const emptyMessage = computed(() => {
  const q = query.value.trim();
  if (q) return `No members matching “${q}”`;
  return "No members found";
});

const assignMeUser = computed((): IUser | null => {
  const id = props.currentUserId;
  if (id == null || excludeIds.value.has(id)) return null;
  if (props.currentUser?.id === id) return props.currentUser;
  return (
    (users.value ?? []).find((u) => u.id === id) ??
    props.list.items.find((m) => m.user.id === id)?.user ??
    null
  );
});

const showAssignMe = computed(
  () => props.currentUserId != null && !excludeIds.value.has(props.currentUserId),
);

function matchesQuery(user: IUser, q: string): boolean {
  if (!q) return true;
  const hay = `${user.name} ${user.email ?? ""}`.toLowerCase();
  return hay.includes(q);
}

/** Selected (matching query) first, then catalog — deduped; excludes hard-excluded ids. */
const visibleUsers = computed((): IUser[] => {
  const q = query.value.trim().toLowerCase();
  const seen = new Set<number>();
  const out: IUser[] = [];

  const push = (user: IUser) => {
    if (excludeIds.value.has(user.id) || seen.has(user.id)) return;
    if (!matchesQuery(user, q)) return;
    seen.add(user.id);
    out.push(user);
  };

  for (const user of [...(users.value ?? [])].sort((a, b) => a.name.localeCompare(b.name))) {
    push(user);
  }
  for (const member of props.list.items) {
    push(member.user);
  }
  return out;
});

function isSelected(userId: number): boolean {
  return selectedIds.value.has(userId);
}

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

function onToggle(user: IUser) {
  if (isSelected(user.id)) onRemove(user);
  else onAdd(user);
}

function onAssignMe() {
  const me = assignMeUser.value;
  if (!me) return;
  onToggle(me);
}

function onLoadMore() {
  if (props.disabled) return;
  emit("load-more");
}

function clearQuery() {
  query.value = "";
}
</script>

<template>
  <div class="min-w-[16rem]">
    <div class="relative">
      <MenuInput v-model="query" :placeholder="searchPlaceholder" auto-focus class="pr-8" />
      <Button
        v-if="query.trim()"
        type="button"
        size="icon"
        variant="ghost"
        class="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
        title="Clear search"
        aria-label="Clear search"
        @click="clearQuery"
        @pointerdown.stop
      >
        <X class="h-3.5 w-3.5" />
      </Button>
    </div>

    <MenuSeparator />

    <template v-if="showAssignMe">
      <MenuItem
        class="flex items-center gap-2 text-sm"
        :disabled="disabled || !assignMeUser"
        @select="
          ($event) => {
            $event.preventDefault();
            onAssignMe();
          }
        "
      >
        <Icon name="oi-person" class="h-4 w-4 text-muted-foreground" />
        <span class="flex-1">Assign me</span>
        <Check v-if="assignMeUser && isSelected(assignMeUser.id)" class="h-4 w-4 text-muted-foreground" />
      </MenuItem>
      <MenuSeparator />
    </template>

    <div class="px-2 py-1 text-[11px] text-muted-foreground">{{ sectionLabel }}</div>

    <ScrollArea class="h-52 min-h-0" @reached-bottom="onLoadMore">
      <div class="!block">
        <MenuItem
          v-for="user in visibleUsers"
          :key="user.id"
          class="flex items-center gap-2"
          :class="isCompact ? 'py-1.5' : 'py-2'"
          :disabled="disabled"
          @select="
            ($event) => {
              $event.preventDefault();
              onToggle(user);
            }
          "
        >
          <UserAvatar :name="user.name" :picture="user.picture" size="sm" :title="user.name" />
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm">{{ user.name }}</div>
            <div v-if="!isCompact && user.email" class="truncate text-xs text-muted-foreground">
              {{ user.email }}
            </div>
          </div>
          <Check v-if="isSelected(user.id)" class="h-4 w-4 shrink-0 text-muted-foreground" />
        </MenuItem>

        <div v-if="list.loading && visibleUsers.length === 0" class="px-2 py-2 text-xs text-muted-foreground">
          Loading…
        </div>
        <div v-else-if="list.loadingMore" class="px-2 py-2 text-xs text-muted-foreground">Loading…</div>
        <div v-else-if="visibleUsers.length === 0" class="px-2 py-2 text-xs text-muted-foreground">
          {{ emptyMessage }}
        </div>
        <div
          v-else-if="!list.hasMore && visibleUsers.length > 0"
          class="px-2 py-2 text-xs text-muted-foreground"
        >
          End of results
        </div>
      </div>
    </ScrollArea>
  </div>
</template>
