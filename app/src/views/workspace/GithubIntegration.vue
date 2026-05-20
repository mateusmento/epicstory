<script setup lang="ts">
import { Button } from "@/design-system";
import { useDependency } from "@/core/dependency-injection";
import { GithubIntegrationApi } from "@epicstory/api-client";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const api = useDependency(GithubIntegrationApi);

const workspaceId = computed(() => Number(route.params.workspaceId));

const loading = ref(false);
const status = ref<Awaited<ReturnType<typeof api.getStatus>>>();

async function refresh() {
  loading.value = true;
  try {
    status.value = await api.getStatus(workspaceId.value);
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);
</script>

<template>
  <div class="p-6 max-w-3xl">
    <div class="text-lg font-semibold">GitHub</div>
    <div class="text-sm text-secondary-foreground mt-1">
      Connect your workspace to GitHub (App installation + member authorization) to link repos and open pull
      requests from issues.
    </div>

    <div class="mt-6 border rounded-lg p-4">
      <div class="flex items-center justify-between gap-4">
        <div class="flex flex-col gap-1">
          <div class="text-sm font-medium">Status</div>
          <div v-if="!status" class="text-sm text-secondary-foreground">Loading…</div>
          <template v-else>
            <div class="text-sm text-secondary-foreground">
              GitHub App env:
              <span class="font-medium">{{ status.appConfigured ? "configured" : "not configured" }}</span>
            </div>
            <div v-if="status.installation" class="text-sm text-secondary-foreground">
              Workspace install:
              <span class="font-medium">{{ status.installation.accountLogin }}</span>
              ({{ status.installation.accountType }})
            </div>
            <div v-else class="text-sm text-secondary-foreground">No workspace installation yet.</div>
            <div v-if="status.user" class="text-sm text-secondary-foreground">
              Your GitHub account:
              <span class="font-medium">{{ status.user.githubLogin }}</span>
            </div>
            <div v-else class="text-sm text-secondary-foreground">
              You have not linked your GitHub user yet.
            </div>
          </template>
        </div>

        <div class="flex items-center gap-2">
          <Button variant="outline" :disabled="loading" @click="refresh"> Refresh </Button>
        </div>
      </div>
    </div>

    <div class="mt-4 text-sm text-secondary-foreground">
      OAuth install flows and repository linking are next — this page confirms API wiring and database tables.
    </div>
  </div>
</template>
