<script lang="ts" setup>
import type { IssueReference } from "@epicstory/contracts";
import { issueStatusDotClass } from "@/presentationals/issue/status/status-fns";
import { computed } from "vue";
import { useRouter } from "vue-router";

const props = withDefaults(
  defineProps<{
    attrs: Record<string, unknown> | undefined;
    issueById?: (id: number) => IssueReference | undefined;
    /** When false, badge is display-only (composer while editing). Default true for preview. */
    navigateOnClick?: boolean;
  }>(),
  { navigateOnClick: true },
);

const router = useRouter();

const issueId = computed(() => {
  const raw = props.attrs?.issueId ?? props.attrs?.id;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
});

const hydrated = computed(() =>
  issueId.value != null && props.issueById ? props.issueById(issueId.value) : undefined,
);

const issueKey = computed(
  () => hydrated.value?.issueKey ?? (props.attrs?.issueKey != null ? String(props.attrs.issueKey) : ""),
);
const title = computed(
  () => hydrated.value?.title ?? (props.attrs?.title != null ? String(props.attrs.title) : ""),
);
const status = computed(
  () => hydrated.value?.status ?? (props.attrs?.status != null ? String(props.attrs.status) : "todo"),
);
const workspaceId = computed(
  () =>
    hydrated.value?.workspaceId ??
    (props.attrs?.workspaceId != null ? Number(props.attrs.workspaceId) : null),
);
const projectId = computed(
  () => hydrated.value?.projectId ?? (props.attrs?.projectId != null ? Number(props.attrs.projectId) : null),
);

const ariaLabel = computed(() => {
  const key = issueKey.value;
  const t = title.value;
  if (key && t) return `${key} ${t}`;
  if (key) return key;
  if (t) return t;
  return issueId.value != null ? `#${issueId.value}` : "Issue";
});

function navigateToIssue(ev: Event) {
  if (!props.navigateOnClick) return;
  ev.preventDefault();
  ev.stopPropagation();
  const wid = workspaceId.value;
  const pid = projectId.value;
  const iid = issueId.value;
  if (wid == null || pid == null || iid == null) return;
  if (!Number.isFinite(wid) || !Number.isFinite(pid)) return;
  router.push(`/${wid}/project/${pid}/issue/${iid}`);
}
</script>

<template>
  <span
    class="issue-badge inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-left text-[13px] font-medium text-foreground align-baseline transition-colors"
    :class="props.navigateOnClick ? 'cursor-pointer hover:bg-muted' : 'cursor-default'"
    :role="props.navigateOnClick ? 'link' : undefined"
    :tabindex="props.navigateOnClick ? 0 : undefined"
    :title="ariaLabel"
    :aria-label="ariaLabel"
    @click="navigateToIssue"
    @keydown.enter="navigateToIssue"
  >
    <span
      class="h-2 w-2 shrink-0 rounded-full ring-1 ring-border"
      :class="issueStatusDotClass(status)"
      aria-hidden="true"
    />
    <span v-if="issueKey" class="shrink-0 font-mono text-[12px] text-muted-foreground">{{ issueKey }}</span>
    <span v-if="title" class="min-w-0 truncate">{{ title }}</span>
    <span v-else-if="!issueKey" class="min-w-0 truncate">{{ ariaLabel }}</span>
  </span>
</template>
