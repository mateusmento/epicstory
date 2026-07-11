<script lang="ts" setup>
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/design-system";
import { ChevronDown, ChevronRight, GitBranch, Plus } from "lucide-vue-next";
import { computed, ref, watch } from "vue";

const props = defineProps<{
  showGithubSection: boolean;
  /** After integration status has finished loading. */
  statusReady?: boolean;
  itemCount?: number;
  openPrCount?: number;
  branchCount?: number;
  defaultOpen?: boolean;
  canCreateBranch?: boolean;
  createBranchDisabled?: boolean;
  /** Setup blocked (install / link) — hide Create branch so header matches body. */
  setupBlocked?: boolean;
}>();

const emit = defineEmits<{
  (e: "create-branch"): void;
}>();

const open = ref(false);

// Auto-open when there is something to show; never force-close (busy/reload flickers must not collapse).
watch(
  () => props.defaultOpen,
  (v) => {
    if (v) open.value = true;
  },
  { immediate: true },
);

const summary = computed(() => {
  const count = props.itemCount;
  if (count != null) {
    if (count === 0) return "0";
    return String(count);
  }
  const prs = props.openPrCount ?? 0;
  const branches = props.branchCount ?? 0;
  if (prs === 0 && branches === 0) return "No linked work";
  const parts: string[] = [];
  if (prs > 0) parts.push(`${prs} open PR${prs === 1 ? "" : "s"}`);
  if (branches > 0) parts.push(`${branches} branch${branches === 1 ? "" : "es"}`);
  return parts.join(" · ");
});

const showCreateBranch = computed(() => !!props.canCreateBranch && !props.setupBlocked);

const visible = computed(() => {
  if (props.statusReady === false) return false;
  return props.showGithubSection;
});
</script>

<template>
  <Collapsible v-if="visible" v-model:open="open" class="min-w-0 border rounded-lg bg-muted/20">
    <div class="flex items-center py-1 px-1">
      <CollapsibleTrigger as-child>
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-secondary-foreground select-none hover:text-foreground"
        >
          <ChevronDown v-if="open" class="size-3 shrink-0" />
          <ChevronRight v-else class="size-3 shrink-0" />
          <GitBranch class="size-3.5 shrink-0 text-muted-foreground" />
          <small class="font-medium text-foreground">Development</small>
          <small class="text-xs tabular-nums text-muted-foreground">{{ summary }}</small>
        </button>
      </CollapsibleTrigger>

      <div class="flex items-center gap-1">
        <Button
          v-if="showCreateBranch"
          type="button"
          variant="ghost"
          size="icon"
          class="flex:row-md flex:center-y"
          title="Create branch"
          :disabled="createBranchDisabled"
          @click="emit('create-branch')"
        >
          <Plus class="size-3.5 shrink-0" />
          <small>Create branch</small>
        </Button>
      </div>
    </div>

    <CollapsibleContent>
      <div class="flex:col min-w-0">
        <slot name="banners" />
        <slot name="list" />
        <slot name="workflow" />
        <slot name="create-branch-dialog" />
      </div>
    </CollapsibleContent>
  </Collapsible>
</template>
