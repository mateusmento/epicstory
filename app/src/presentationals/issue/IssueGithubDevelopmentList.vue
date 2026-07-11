<script lang="ts" setup>
import type { AsyncDataView } from "@/lib/async";
import type {
  GithubPrStatusFilter,
  IssueDevelopmentBranchItem,
  IssueDevelopmentGroup,
  IssueDevelopmentItem,
} from "@/lib/github";
import { Button, ButtonGroup, Menu, MenuContent, MenuItem, MenuTrigger, Separator } from "@/design-system";
import { ChevronDown, ExternalLink } from "lucide-vue-next";
import { computed } from "vue";

const props = defineProps<{
  groups: IssueDevelopmentGroup[];
  branches: AsyncDataView<unknown[]>;
  pullRequests: AsyncDataView<unknown[]>;
  /** When true, show filter chips even with a single PR. */
  showFilter?: boolean;
  mutationBusy?: boolean;
  canOpenPull?: boolean;
  issueKeyHint?: string;
}>();

const prStatusFilter = defineModel<GithubPrStatusFilter>("prStatusFilter", { required: true });

const emit = defineEmits<{
  (e: "open-pull", payload: { owner: string; repoName: string; branchName: string; draft: boolean }): void;
}>();

const loading = computed(() => props.branches.loading || props.pullRequests.loading);
const error = computed(() => props.branches.error || props.pullRequests.error);
const isEmpty = computed(() => props.groups.every((g) => g.items.length === 0));
const hasAnyPrData = computed(() => (props.pullRequests.data?.length ?? 0) > 0);
const hasSourceData = computed(() => (props.branches.data?.length ?? 0) > 0 || hasAnyPrData.value);
const showFilterBar = computed(() => props.showFilter === true || hasAnyPrData.value);

const filterOptions: { value: GithubPrStatusFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "merged", label: "Merged" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

function onOpenPull(item: IssueDevelopmentBranchItem, draft: boolean) {
  emit("open-pull", {
    owner: item.owner,
    repoName: item.repoName,
    branchName: item.branchName,
    draft,
  });
}

function itemTitle(item: IssueDevelopmentItem): string {
  if (item.kind === "pr") {
    const ref = item.headRef ? ` · ${item.headRef}` : "";
    return `#${item.prNumber} ${item.statusLabel}${ref}`;
  }
  return item.branchName;
}
</script>

<template>
  <div class="flex:col min-w-0">
    <div v-if="showFilterBar && hasAnyPrData" class="flex flex-wrap items-center gap-1 px-2 py-1">
      <Button
        v-for="opt in filterOptions"
        :key="opt.value"
        :variant="prStatusFilter === opt.value ? 'soft' : 'ghost'"
        :intent="prStatusFilter === opt.value ? 'primary' : 'secondary'"
        size="icon"
        class="text-xs font-normal"
        @click="prStatusFilter = opt.value"
      >
        {{ opt.label }}
      </Button>
    </div>

    <Separator />

    <div v-if="loading" class="text-xs text-muted-foreground px-4 py-2">Loading linked work…</div>
    <div v-else-if="error" class="text-xs text-red-600 px-4 py-2">{{ error }}</div>
    <div v-else-if="isEmpty && hasSourceData" class="text-xs text-muted-foreground px-4 py-2">
      No linked work matches this filter.
    </div>
    <div v-else-if="isEmpty" class="text-xs text-muted-foreground px-4 py-2">
      No linked branches or pull requests yet.
      <span v-if="issueKeyHint">
        Create a branch, or push one whose name contains
        <span class="font-mono">{{ issueKeyHint }}</span
        >.
      </span>
    </div>
    <ul v-else class="flex:col min-w-0 divide-y">
      <template v-for="group in groups" :key="group.fullName">
        <li class="px-4 py-2 truncate font-medium" :title="group.fullName">
          <small>{{ group.fullName }}</small>
        </li>
        <li v-for="item in group.items" :key="item.id" class="flex items-center gap-2 h-8 min-w-0 px-6">
          <div
            class="size-1.5 shrink-0 rounded-full"
            :class="item.kind === 'pr' ? 'bg-foreground' : 'border border-muted-foreground/70'"
            aria-hidden="true"
          />
          <a
            :href="item.htmlUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-foreground hover:underline"
          >
            <div class="flex:row-md flex:center-y min-w-0 truncate">
              <template v-if="item.kind === 'pr'">
                <small class="font-medium">#{{ item.prNumber }}</small>
                <small class="text-muted-foreground"> {{ item.statusLabel }}</small>
                <small v-if="item.headRef" class="font-mono text-xs text-muted-foreground">
                  · {{ item.headRef }}
                </small>
              </template>
              <template v-else>
                <small class="font-medium">{{ item.branchName }}</small>
              </template>
            </div>
            <ExternalLink class="size-3.5 shrink-0 text-muted-foreground" :aria-label="itemTitle(item)" />
          </a>

          <Menu v-if="item.kind === 'branch' && canOpenPull" type="dropdown-menu">
            <MenuTrigger as-child>
              <Button
                type="button"
                variant="soft"
                intent="secondary"
                size="icon"
                class="py-0.5"
                :disabled="mutationBusy"
              >
                <small>Open PR</small>
                <ChevronDown class="size-3.5 opacity-70 ml-1" />
              </Button>
            </MenuTrigger>
            <MenuContent align="end" class="min-w-[12rem]">
              <MenuItem class="cursor-pointer text-sm" @select="onOpenPull(item, false)">
                <small>Create pull request</small>
              </MenuItem>
              <MenuItem class="cursor-pointer text-sm" @select="onOpenPull(item, true)">
                <small>Create draft pull request</small>
              </MenuItem>
            </MenuContent>
          </Menu>
        </li>
      </template>
    </ul>
  </div>
</template>
