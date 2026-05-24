<script lang="ts" setup>
import { MagnifyingGlassIcon } from "@radix-icons/vue";
import { Check, ChevronDown } from "lucide-vue-next";
import { computed } from "vue";
import { Button, Popover, PopoverContent, PopoverTrigger, ScrollArea } from "@/design-system";
import { cn } from "@/design-system/utils";

const open = defineModel<boolean>("open", { required: true });
const search = defineModel<string>("search", { required: true });

const props = defineProps<{
  triggerLabel: string | null;
  branches: { name: string }[];
  loading?: boolean;
  loadingMore?: boolean;
  error?: string | null;
  createLabel: string;
  createDisabled?: boolean;
  disabled?: boolean;
  selectedBranchName?: string | null;
}>();

const emit = defineEmits<{
  select: [branchName: string];
  create: [];
  "load-more": [];
}>();

const placeholder = "Select a branch or create one";

const displayLabel = computed(() => props.triggerLabel ?? placeholder);

const createButtonDisabled = computed(() => props.disabled || props.loading || props.createDisabled);

function onReachedBottom(): void {
  if (props.loading || props.loadingMore) return;
  emit("load-more");
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        role="combobox"
        :aria-expanded="open"
        :disabled="disabled"
        class="flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          class="truncate text-left font-mono"
          :class="triggerLabel ? 'text-foreground' : 'text-muted-foreground'"
        >
          {{ displayLabel }}
        </span>
        <ChevronDown
          :class="cn('h-4 w-4 shrink-0 opacity-50 transition-transform duration-200', open && 'rotate-180')"
        />
      </button>
    </PopoverTrigger>
    <PopoverContent
      class="z-[70] flex w-[var(--radix-popover-trigger-width)] flex-col p-0"
      align="start"
      :side-offset="4"
    >
      <div class="flex items-center border-b px-3" cmdk-input-wrapper>
        <MagnifyingGlassIcon class="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <input
          v-model="search"
          class="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Search or name a new branch…"
          autocomplete="off"
        />
      </div>

      <div class="border-b p-1 min-w-0">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          class="h-auto w-full min-w-0 max-w-full justify-start overflow-hidden px-2 py-1.5"
          :disabled="createButtonDisabled"
          :title="createLabel"
          @click="emit('create')"
        >
          <span class="truncate text-sm font-normal font-mono">{{ createLabel }}</span>
        </Button>
      </div>

      <ScrollArea class="h-60 min-h-0 max-h-60" @reached-bottom="onReachedBottom">
        <div class="!block p-1">
          <p v-if="loading" class="px-2 py-4 text-center text-xs text-muted-foreground">Loading branches…</p>
          <p v-else-if="error" class="px-2 py-4 text-center text-xs text-red-600">{{ error }}</p>
          <template v-else>
            <button
              v-for="branch in branches"
              :key="branch.name"
              type="button"
              class="relative flex w-full min-w-0 cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-mono outline-none hover:bg-accent hover:text-accent-foreground"
              @click="emit('select', branch.name)"
            >
              <Check
                :class="
                  cn('h-4 w-4 shrink-0', selectedBranchName === branch.name ? 'opacity-100' : 'opacity-0')
                "
              />
              <span class="truncate">{{ branch.name }}</span>
            </button>
            <p v-if="branches.length === 0" class="px-2 py-4 text-center text-xs text-muted-foreground">
              No branches match your search.
            </p>
            <p v-if="loadingMore" class="px-2 py-2 text-center text-xs text-muted-foreground">
              Loading more…
            </p>
          </template>
        </div>
      </ScrollArea>
    </PopoverContent>
  </Popover>
</template>
