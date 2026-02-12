<script setup lang="ts">
import { useDependency } from "@/core/dependency-injection";
import { Button, Input } from "@/design-system";
import { config } from "@/config";
import { useRoute } from "vue-router";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { LinearIntegrationApi, type LinearMismatch, type LinearProject } from "@/domain/integrations/linear";
import { useWorkspace } from "@/domain/workspace";

const route = useRoute();
const api = useDependency(LinearIntegrationApi);
const { projects: epicProjects, fetchProjects } = useWorkspace();

const workspaceId = computed(() => Number(route.params.workspaceId));

const loading = ref(false);
const connection = ref<Awaited<ReturnType<typeof api.getWorkspaceConnection>>>();

const importAll = ref(true);
const projects = ref<LinearProject[]>([]);
const selectedProjectIds = ref<string[]>([]);
const projectMappings = ref<Record<string, number | null>>({});

const jobId = ref<string>();
const job = ref<any>();
const mismatches = ref<LinearMismatch[]>([]);
const pollMs = ref(1500);
let timer: number | undefined;

function oauthStartUrl() {
  const redirect = `/${workspaceId.value}/settings/integrations/linear`;
  const url = new URL(`${config.API_URL}/integrations/linear/oauth/start`);
  url.searchParams.set("workspaceId", String(workspaceId.value));
  url.searchParams.set("redirect", redirect);
  return url.toString();
}

async function refreshConnection() {
  connection.value = await api.getWorkspaceConnection(workspaceId.value);
}

async function disconnect() {
  await api.disconnectWorkspace(workspaceId.value);
  connection.value = null;
}

async function loadProjects() {
  projects.value = await api.listProjects(workspaceId.value);
  if (importAll.value) selectedProjectIds.value = [];
  for (const p of projects.value) {
    if (!(p.id in projectMappings.value)) {
      projectMappings.value[p.id] = null;
    }
  }
}

async function startImport() {
  const mappings = {
    projects: Object.fromEntries(
      Object.entries(projectMappings.value)
        .filter(([linearProjectId, epicProjectId]) => {
          if (!epicProjectId) return false;
          if (importAll.value) return false;
          return selectedProjectIds.value.includes(linearProjectId);
        })
        .map(([linearProjectId, epicProjectId]) => [linearProjectId, epicProjectId]),
    ),
  };

  const res = await api.createImportJob(workspaceId.value, {
    importAll: importAll.value,
    projectIds: importAll.value ? [] : selectedProjectIds.value,
    mappings,
  });
  jobId.value = res.id;
  mismatches.value = [];
  await poll();
}

async function poll() {
  if (!jobId.value) return;
  job.value = await api.getImportJob(jobId.value);
  if (job.value.status === "completed" || job.value.status === "failed") {
    mismatches.value = await api.getMismatches(jobId.value);
    stopPolling();
    return;
  }
  stopPolling();
  timer = window.setInterval(async () => {
    try {
      await poll();
    } catch {
      // ignore transient errors while polling
    }
  }, pollMs.value);
}

function stopPolling() {
  if (timer) window.clearInterval(timer);
  timer = undefined;
}

function downloadMismatches() {
  const blob = new Blob([JSON.stringify(mismatches.value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `linear-import-mismatches-${jobId.value ?? "job"}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

onMounted(async () => {
  loading.value = true;
  try {
    await refreshConnection();
    if (connection.value) {
      await loadProjects();
      await fetchProjects();
    }
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(stopPolling);
</script>

<template>
  <div class="p-6 max-w-3xl">
    <div class="text-lg font-semibold">Linear Integration</div>
    <div class="text-sm text-secondary-foreground mt-1">
      Connect a Linear workspace, select projects, and import issues into your Epicstory backlog.
    </div>

    <div class="mt-6 border rounded-lg p-4">
      <div class="flex items-center justify-between gap-4">
        <div class="flex flex-col">
          <div class="text-sm font-medium">Connection</div>
          <div v-if="connection" class="text-sm text-secondary-foreground">
            Connected to <span class="font-medium">{{ connection.linearOrgName }}</span>
          </div>
          <div v-else class="text-sm text-secondary-foreground">Not connected</div>
        </div>

        <div class="flex items-center gap-2">
          <Button v-if="!connection" :disabled="loading" :as="'a'" :href="oauthStartUrl()">
            Connect Linear
          </Button>
          <Button v-else variant="destructive" :disabled="loading" @click="disconnect"> Disconnect </Button>
        </div>
      </div>
    </div>

    <div v-if="connection" class="mt-6 border rounded-lg p-4">
      <div class="text-sm font-medium">Import</div>

      <div class="mt-3 flex items-center gap-3">
        <input type="checkbox" v-model="importAll" class="accent-primary" />
        <div class="text-sm">Import all Linear projects</div>
        <Button variant="ghost" size="sm" @click="loadProjects">Refresh projects</Button>
      </div>

      <div v-if="!importAll" class="mt-4">
        <div class="text-xs text-secondary-foreground mb-2">Select projects</div>
        <div class="max-h-64 overflow-auto border rounded-md p-2 flex flex-col gap-1">
          <label
            v-for="p of projects"
            :key="p.id"
            class="flex items-center gap-3 text-sm px-2 py-1 rounded hover:bg-secondary"
          >
            <input type="checkbox" :value="p.id" v-model="selectedProjectIds" class="accent-primary" />
            <span class="truncate">{{ p.name || p.id }}</span>

            <div class="ml-auto flex items-center gap-2">
              <div class="text-xs text-secondary-foreground">Map to</div>
              <select v-model="projectMappings[p.id]" class="text-xs border rounded px-2 py-1 bg-background">
                <option :value="null">Auto-create</option>
                <option v-for="ep of epicProjects" :key="ep.id" :value="ep.id">
                  {{ ep.name }}
                </option>
              </select>
            </div>
          </label>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between gap-4">
        <div class="text-xs text-secondary-foreground">
          Imports run in the background; you can leave this page open to watch progress.
        </div>
        <Button :disabled="loading" @click="startImport">Start import</Button>
      </div>

      <div v-if="job" class="mt-6 border rounded-md p-3">
        <div class="text-sm font-medium">Job</div>
        <div class="text-sm text-secondary-foreground mt-1">
          Status: <span class="font-medium">{{ job.status }}</span>
          <span v-if="job.lastError" class="text-destructive"> — {{ job.lastError }}</span>
        </div>
        <div v-if="job.progress" class="text-xs text-secondary-foreground mt-2">
          {{ job.progress }}
        </div>
        <div class="mt-3 flex items-center gap-2">
          <div class="text-xs text-secondary-foreground">Polling (ms)</div>
          <input
            class="w-24 text-xs border rounded px-2 py-1 bg-background"
            v-model.number="pollMs"
            type="number"
            min="250"
            step="250"
          />
          <Button variant="ghost" size="sm" @click="poll">Refresh now</Button>
        </div>
      </div>

      <div v-if="mismatches.length" class="mt-6 border rounded-md p-3">
        <div class="flex items-center justify-between gap-3">
          <div class="text-sm font-medium">Mismatches</div>
          <Button variant="ghost" size="sm" @click="downloadMismatches">Download JSON</Button>
        </div>
        <div class="mt-2 flex flex-col gap-2">
          <div v-for="m of mismatches" :key="m.id" class="text-sm">
            <div class="font-medium">{{ m.type }}</div>
            <div class="text-secondary-foreground">{{ m.message }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
