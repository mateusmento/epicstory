<script lang="ts" setup>
import type { GithubIntegrationAccess, GithubWorkflowMutation } from "@/lib/github";
import { computed } from "vue";
import { RouterLink } from "vue-router";

const props = defineProps<{
  access: GithubIntegrationAccess;
  formVisible: boolean;
  mutation: GithubWorkflowMutation;
}>();

/**
 * Inline only for durable setup state. Create-branch / open-PR failures are toasted
 * (transient — user may retry).
 */
type CalloutKind = "install" | "link" | "missing" | "reconnect";

const callout = computed((): CalloutKind | null => {
  if (props.access.adminNeedsWorkspaceInstall) return "install";
  if (props.access.memberNeedsAccountLink) return "link";
  if (!props.formVisible) return null;
  if (props.mutation.installationMissingOnGithub) return "missing";
  if (props.mutation.reconnectSuggested) return "reconnect";
  return null;
});

const calloutClass: Record<CalloutKind, string> = {
  install: "border-l-border bg-muted/40 text-secondary-foreground",
  link: "border-l-amber-600/50 bg-amber-500/5 text-amber-950 dark:text-amber-100",
  missing: "border-l-destructive/60 bg-destructive/5 text-destructive",
  reconnect: "border-l-amber-600/50 bg-amber-500/5 text-amber-950 dark:text-amber-100",
};
</script>

<template>
  <div v-if="callout" class="min-w-0 border-t border-border">
    <div
      class="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l-2 px-3 py-2 text-xs"
      :class="calloutClass[callout]"
    >
      <p class="min-w-0 flex-1 leading-snug">
        <template v-if="callout === 'install'">
          Enable GitHub for this workspace before creating branches from issues.
        </template>
        <template v-else-if="callout === 'link'">
          Link your GitHub account to create branches and pull requests from issues.
        </template>
        <template v-else-if="callout === 'missing'">
          GitHub reports this workspace installation is gone. Ask a workspace admin to reinstall the app.
        </template>
        <template v-else>
          {{ mutation.error || "Reconnect your GitHub account to continue." }}
        </template>
      </p>
      <RouterLink
        :to="access.settingsRoute"
        class="shrink-0 font-medium text-foreground underline-offset-2 hover:underline"
      >
        <template v-if="callout === 'install'">Install app</template>
        <template v-else-if="callout === 'link' || callout === 'reconnect'">Link account</template>
        <template v-else>GitHub settings</template>
      </RouterLink>
    </div>
  </div>
</template>
