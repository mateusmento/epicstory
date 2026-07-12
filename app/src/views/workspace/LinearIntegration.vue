<script setup lang="ts">
import { config } from "@/config";
import { useDependency } from "@/core/dependency-injection";
import {
  Badge,
  Button,
  Checkbox,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system";
import { useWorkspace } from "@/domain/workspace";
import { suggestEpicProjectMatch } from "@/lib/integrations/linear-project-match";
import { useConfirmDialog } from "@/presentationals/confirm-dialog";
import { LinearIntegrationApi } from "@epicstory/api-client";
import type {
  ILinearImportJob,
  ILinearImportProgress,
  ILinearMismatch,
  ILinearProject,
  ILinearProjectMap,
} from "@epicstory/contracts";
import { AxiosError } from "axios";
import { Loader2, RefreshCw } from "lucide-vue-next";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { toast } from "vue-sonner";

const route = useRoute();
const api = useDependency(LinearIntegrationApi);
const confirmDialog = useConfirmDialog();
const { projects: epicProjects, fetchProjects } = useWorkspace();

const workspaceId = computed(() => Number(route.params.workspaceId));

const loading = ref(false);
const refreshingProjects = ref(false);
const startingImport = ref(false);
const connection = ref<Awaited<ReturnType<typeof api.getWorkspaceConnection>>>();

const projects = ref<ILinearProject[]>([]);
const projectMaps = ref<ILinearProjectMap[]>([]);
const selectedProjectIds = ref<string[]>([]);
/** null = Auto-create; number = existing Epic project id */
const projectMappings = ref<Record<string, number | null>>({});
/** Tracks whether the user explicitly chose a destination (vs auto-suggest). */
const mappingTouched = ref<Record<string, boolean>>({});

const jobId = ref<string>();
const job = ref<ILinearImportJob | null>(null);
const mismatches = ref<ILinearMismatch[]>([]);
const POLL_MS = 1500;
let timer: number | undefined;
let loadingToastId: string | number | undefined;

function commandErrorMessage(e: unknown, fallback: string): string {
  // Programming / unexpected client errors — log for engineers, never toast the raw text.
  if (
    e instanceof TypeError ||
    e instanceof ReferenceError ||
    e instanceof SyntaxError ||
    (e instanceof Error && /is not a function|Cannot read propert/i.test(e.message))
  ) {
    console.error(e);
    return fallback;
  }

  if (e instanceof AxiosError) {
    const data = e.response?.data as { message?: string | string[] } | undefined;
    const msg = data?.message;
    if (Array.isArray(msg) && msg.length) {
      const joined = msg.filter((m) => typeof m === "string" && m.trim()).join(", ");
      if (joined) return joined;
    }
    if (typeof msg === "string" && msg.trim()) return msg.trim();
    // No useful API message (network / 5xx without body) → fallback.
    return fallback;
  }

  return fallback;
}

function clearLoadingToast() {
  if (loadingToastId == null) return;
  toast.dismiss(loadingToastId);
  loadingToastId = undefined;
}

function oauthStartUrl() {
  const redirect = `/${workspaceId.value}/settings/integrations/linear`;
  const url = new URL(`${config.API_URL}/integrations/linear/oauth/start`);
  url.searchParams.set("workspaceId", String(workspaceId.value));
  url.searchParams.set("redirect", redirect);
  return url.toString();
}

const jobRunning = computed(() => {
  const s = job.value?.status;
  return s === "pending" || s === "running" || s === "retry";
});

const canStartImport = computed(() => {
  if (!connection.value || loading.value || startingImport.value || jobRunning.value) return false;
  return selectedProjectIds.value.length > 0;
});

const progress = computed((): ILinearImportProgress | null => {
  const raw = job.value?.progress;
  if (!raw || typeof raw !== "object") return null;
  return raw as ILinearImportProgress;
});

const progressSummary = computed(() => {
  const p = progress.value;
  if (!p) return null;
  const parts: string[] = [];
  if (typeof p.importedProjects === "number") {
    parts.push(`${p.importedProjects} project${p.importedProjects === 1 ? "" : "s"}`);
  }
  if (typeof p.importedIssues === "number") {
    parts.push(`${p.importedIssues} issue${p.importedIssues === 1 ? "" : "s"}`);
  }
  if (p.lastProject) parts.push(`last: ${p.lastProject}`);
  return parts.length ? parts.join(" · ") : null;
});

const outcomeSummary = computed(() => {
  const p = progress.value;
  if (!p?.outcomes?.length && p?.createdProjects == null && p?.mappedProjects == null) {
    return null;
  }
  const created = p.createdProjects ?? p.outcomes?.filter((o) => o.mode === "created").length ?? 0;
  const mapped = p.mappedProjects ?? p.outcomes?.filter((o) => o.mode === "mapped").length ?? 0;
  return { created, mapped, outcomes: p.outcomes ?? [] };
});

const mismatchesByType = computed(() => {
  const map = new Map<string, ILinearMismatch[]>();
  for (const m of mismatches.value) {
    const list = map.get(m.type) ?? [];
    list.push(m);
    map.set(m.type, list);
  }
  return [...map.entries()]
    .map(([type, items]) => ({ type, items, count: items.length }))
    .sort((a, b) => a.type.localeCompare(b.type));
});

const epicById = computed(() => new Map(epicProjects.value.map((p) => [p.id, p])));

const mapsByLinear = computed(() => {
  const m = new Map<string, number>();
  for (const row of projectMaps.value) m.set(row.linearProjectId, row.epicProjectId);
  return m;
});

const mapsByEpic = computed(() => {
  const m = new Map<number, string>();
  for (const row of projectMaps.value) m.set(row.epicProjectId, row.linearProjectId);
  return m;
});

function suggestionFor(linear: ILinearProject) {
  return suggestEpicProjectMatch(
    linear.name || linear.id,
    epicProjects.value.map((p) => ({ id: p.id, name: p.name })),
  );
}

function destinationWarning(linearProjectId: string, epicProjectId: number | null): string | null {
  if (epicProjectId == null) return null;
  const linkedLinear = mapsByEpic.value.get(epicProjectId);
  if (linkedLinear && linkedLinear !== linearProjectId) {
    return "This Epicstory project is already linked to another Linear project.";
  }
  const linkedEpic = mapsByLinear.value.get(linearProjectId);
  if (linkedEpic != null && linkedEpic !== epicProjectId) {
    return "This Linear project is already linked to a different Epicstory project.";
  }
  return null;
}

function isSelected(id: string) {
  return selectedProjectIds.value.includes(id);
}

function setSelected(id: string, checked: boolean | "indeterminate") {
  const on = checked === true;
  const set = new Set(selectedProjectIds.value);
  if (on) set.add(id);
  else set.delete(id);
  selectedProjectIds.value = [...set];
}

function destinationModel(id: string) {
  const v = projectMappings.value[id];
  return v == null ? "null" : String(v);
}

function humanMismatchType(type: string) {
  return type.replace(/_/g, " ");
}

function jobStatusIntent(status: string | undefined) {
  if (status === "completed") return "success" as const;
  if (status === "failed") return "destructive" as const;
  if (status === "running" || status === "pending" || status === "retry") return "primary" as const;
  return "secondary" as const;
}

function applySuggestions() {
  for (const p of projects.value) {
    if (mappingTouched.value[p.id]) continue;
    const existing = mapsByLinear.value.get(p.id);
    if (existing != null) {
      projectMappings.value[p.id] = existing;
      continue;
    }
    const suggestion = suggestionFor(p);
    if (suggestion) projectMappings.value[p.id] = suggestion.id;
  }
}

function onDestinationChange(linearProjectId: string, raw: string) {
  mappingTouched.value[linearProjectId] = true;
  if (raw === "" || raw === "null") {
    projectMappings.value[linearProjectId] = null;
    return;
  }
  projectMappings.value[linearProjectId] = Number(raw);
}

function selectAll() {
  selectedProjectIds.value = projects.value.map((p) => p.id);
}

function clearSelection() {
  selectedProjectIds.value = [];
}

async function refreshConnection() {
  connection.value = await api.getWorkspaceConnection(workspaceId.value);
}

async function disconnect() {
  const confirmed = await confirmDialog.open({
    title: "Disconnect Linear?",
    description:
      "This revokes Epicstory’s access to Linear for this workspace and removes the saved connection.",
    confirmLabel: "Disconnect",
    cancelLabel: "Cancel",
    destructive: true,
  });
  if (!confirmed) return;

  try {
    await api.disconnectWorkspace(workspaceId.value);
    connection.value = null;
    projects.value = [];
    projectMaps.value = [];
    selectedProjectIds.value = [];
    job.value = null;
    jobId.value = undefined;
    mismatches.value = [];
    stopPolling();
    toast.success("Linear disconnected");
  } catch (e) {
    toast.error(commandErrorMessage(e, "Could not disconnect Linear"));
  }
}

async function loadProjects(opts?: { announce?: boolean }) {
  refreshingProjects.value = true;
  if (opts?.announce) {
    clearLoadingToast();
    loadingToastId = toast.loading("Loading Linear projects…");
  }
  try {
    const [listed, maps] = await Promise.all([
      api.listProjects(workspaceId.value),
      api.listProjectMaps(workspaceId.value),
    ]);
    projects.value = listed;
    projectMaps.value = maps;
    for (const p of projects.value) {
      if (!(p.id in projectMappings.value)) {
        projectMappings.value[p.id] = null;
      }
    }
    applySuggestions();
    clearLoadingToast();
    if (opts?.announce) {
      const n = projects.value.length;
      toast.message(n === 0 ? "No Linear projects found" : `Loaded ${n} project${n === 1 ? "" : "s"}`);
    }
  } catch (e) {
    clearLoadingToast();
    toast.error(commandErrorMessage(e, "Could not load Linear projects"));
  } finally {
    refreshingProjects.value = false;
  }
}

async function startImport() {
  if (!canStartImport.value) return;
  startingImport.value = true;
  clearLoadingToast();
  loadingToastId = toast.loading("Starting import…");
  try {
    const selected = new Set(selectedProjectIds.value);
    const mappings = {
      projects: Object.fromEntries(
        Object.entries(projectMappings.value).filter(([linearProjectId, epicProjectId]) => {
          if (!epicProjectId) return false;
          return selected.has(linearProjectId);
        }),
      ),
    };

    const res = await api.createImportJob(workspaceId.value, {
      importAll: false,
      projectIds: selectedProjectIds.value,
      mappings,
    });
    jobId.value = res.id;
    mismatches.value = [];
    clearLoadingToast();
    toast.message("Import started");
    await poll();
  } catch (e) {
    clearLoadingToast();
    toast.error(commandErrorMessage(e, "Could not start import"));
  } finally {
    startingImport.value = false;
  }
}

async function poll() {
  if (!jobId.value) return;
  try {
    job.value = await api.getImportJob(jobId.value);
  } catch (e) {
    if (!job.value) {
      toast.error(commandErrorMessage(e, "Could not load import job"));
    }
    return;
  }

  if (job.value.status === "completed" || job.value.status === "failed") {
    try {
      mismatches.value = await api.getMismatches(jobId.value);
    } catch {
      mismatches.value = [];
    }
    try {
      projectMaps.value = await api.listProjectMaps(workspaceId.value);
    } catch {
      // keep previous maps
    }
    stopPolling();
    if (job.value.status === "completed") {
      const o = outcomeSummary.value;
      const outcomeBit = o && (o.created || o.mapped) ? ` · ${o.created} created, ${o.mapped} mapped` : "";
      toast.success(
        mismatches.value.length
          ? `Import completed with ${mismatches.value.length} mismatch${mismatches.value.length === 1 ? "" : "es"}${outcomeBit}`
          : `Import completed${outcomeBit}`,
      );
    } else {
      toast.error(job.value.lastError?.trim() || "Import failed");
    }
    return;
  }

  if (timer == null) {
    timer = window.setInterval(() => {
      poll().catch(() => {
        // ignore transient poll errors
      });
    }, POLL_MS);
  }
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
      await fetchProjects();
      await loadProjects();
    }
  } catch (e) {
    toast.error(commandErrorMessage(e, "Could not load Linear connection"));
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  stopPolling();
  clearLoadingToast();
});
</script>

<template>
  <ScrollArea class="min-h-0 flex-1">
    <div class="!block max-w-3xl p-6 pb-10">
      <h1 class="text-lg font-semibold tracking-tight">Linear</h1>
      <p class="text-sm text-secondary-foreground mt-1 max-w-xl">
        Connect a Linear organization, choose projects to import, and map them into your Epicstory backlog.
      </p>

      <!-- Connection -->
      <section class="mt-6 rounded-lg border border-border bg-card shadow-sm">
        <div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-sm font-medium">Connection</h2>
              <Badge v-if="!loading" size="xs" variant="soft" :intent="connection ? 'success' : 'secondary'">
                {{ connection ? "Connected" : "Not connected" }}
              </Badge>
              <Badge v-else size="xs" variant="soft" intent="secondary">Loading…</Badge>
            </div>
            <p v-if="connection" class="text-sm text-secondary-foreground truncate">
              Organization
              <span class="font-medium text-foreground">{{ connection.linearOrgName }}</span>
            </p>
            <p v-else class="text-sm text-secondary-foreground">
              Authorize Epicstory to read your Linear workspace.
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <Button v-if="!connection" :disabled="loading" :as="'a'" :href="oauthStartUrl()">
              Connect Linear
            </Button>
            <Button v-else variant="outline" intent="destructive" :disabled="loading" @click="disconnect">
              Disconnect
            </Button>
          </div>
        </div>
      </section>

      <!-- Import -->
      <section v-if="connection" class="mt-4 rounded-lg border border-border bg-card shadow-sm">
        <div class="border-b border-border px-4 py-3">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0 space-y-1">
              <h2 class="text-sm font-medium">Import projects</h2>
              <p class="text-xs text-secondary-foreground">
                Map Linear projects to existing Epicstory projects. Select <b>auto-create</b> to make new one.
              </p>
            </div>
            <div class="text-xs text-secondary-foreground tabular-nums shrink-0">
              {{ selectedProjectIds.length }} of {{ projects.length }} selected
            </div>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-1.5">
            <Button variant="ghost" size="xs" :disabled="!projects.length" @click="selectAll">
              Select all
            </Button>
            <Button variant="ghost" size="xs" :disabled="!selectedProjectIds.length" @click="clearSelection">
              Clear
            </Button>
            <Button
              variant="ghost"
              size="xs"
              class="gap-1.5"
              :disabled="refreshingProjects"
              @click="loadProjects({ announce: true })"
            >
              <Loader2 v-if="refreshingProjects" class="size-3.5 animate-spin" />
              <RefreshCw v-else class="size-3.5 opacity-70" />
              Refresh
            </Button>
          </div>
        </div>

        <div class="max-h-[28rem] overflow-y-auto">
          <div v-if="!projects.length" class="px-4 py-10 text-center">
            <p class="text-sm font-medium">No Linear projects found</p>
            <p class="mt-1 text-xs text-secondary-foreground">
              Create a project in Linear, then refresh this list.
            </p>
          </div>

          <ul v-else class="divide-y divide-border" role="list">
            <li
              v-for="p of projects"
              :key="p.id"
              class="px-4 py-3 transition-colors"
              :class="isSelected(p.id) ? 'bg-muted/40' : 'hover:bg-muted/20'"
            >
              <div class="flex flex-col gap-3 items-center sm:flex-row sm:justify-between sm:gap-4">
                <label class="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                  <Checkbox
                    class="mt-0.5"
                    :model-value="isSelected(p.id)"
                    @update:model-value="setSelected(p.id, $event)"
                  />
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-medium leading-snug">
                      {{ p.name || p.id }}
                    </span>
                    <span
                      v-if="mapsByLinear.get(p.id)"
                      class="mt-0.5 block text-[11px] text-secondary-foreground"
                    >
                      Previously linked
                    </span>
                  </span>
                </label>

                <div class="flex w-full min-w-0 flex-col gap-1.5 sm:w-[15.5rem] sm:shrink-0">
                  <div class="flex items-center gap-2">
                    <span
                      class="text-[11px] font-medium uppercase tracking-wide text-secondary-foreground shrink-0"
                    >
                      Destination
                    </span>
                    <Select
                      :model-value="destinationModel(p.id)"
                      @update:model-value="onDestinationChange(p.id, String($event))"
                      class="w-full"
                    >
                      <SelectTrigger class="h-8 flex-1 text-xs truncate">
                        <SelectValue placeholder="Auto-create" class="truncate" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Auto-create</SelectItem>
                        <SelectItem v-for="ep of epicProjects" :key="ep.id" :value="String(ep.id)">
                          {{ ep.name }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <p
                    v-if="
                      projectMappings[p.id] == null &&
                      suggestionFor(p) &&
                      !mappingTouched[p.id] &&
                      !mapsByLinear.get(p.id)
                    "
                    class="text-[11px] text-secondary-foreground"
                  >
                    Suggested
                    <button
                      type="button"
                      class="font-medium text-foreground underline-offset-2 hover:underline"
                      @click="
                        mappingTouched[p.id] = true;
                        projectMappings[p.id] = suggestionFor(p)!.id;
                      "
                    >
                      {{ suggestionFor(p)!.name }}
                    </button>
                  </p>
                  <p
                    v-if="destinationWarning(p.id, projectMappings[p.id] ?? null)"
                    class="text-[11px] text-amber-800 dark:text-amber-200"
                  >
                    {{ destinationWarning(p.id, projectMappings[p.id] ?? null) }}
                  </p>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div
          class="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-xs text-secondary-foreground">
            Import runs in the background — leave this page open to watch progress.
          </p>
          <Button class="shrink-0" :disabled="!canStartImport" @click="startImport">
            <Loader2 v-if="startingImport || jobRunning" class="mr-1.5 size-3.5 animate-spin" />
            {{ startingImport || jobRunning ? "Importing…" : "Start import" }}
          </Button>
        </div>
      </section>

      <!-- Progress -->
      <section v-if="job" class="mt-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-medium">Import progress</h2>
          <Badge size="xs" variant="soft" :intent="jobStatusIntent(job.status)" class="capitalize">
            {{ job.status }}
          </Badge>
        </div>
        <p v-if="progressSummary" class="mt-2 text-xs text-secondary-foreground">
          {{ progressSummary }}
        </p>

        <div
          v-if="outcomeSummary && (job.status === 'completed' || outcomeSummary.outcomes.length)"
          class="mt-4 space-y-2"
        >
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <span class="font-medium">Results</span>
            <Badge size="xs" variant="soft" intent="success">{{ outcomeSummary.created }} created</Badge>
            <Badge size="xs" variant="soft" intent="primary">{{ outcomeSummary.mapped }} mapped</Badge>
          </div>
          <ul
            v-if="outcomeSummary.outcomes.length"
            class="divide-y divide-border rounded-md border border-border"
          >
            <li
              v-for="o of outcomeSummary.outcomes"
              :key="o.linearProjectId"
              class="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-xs"
            >
              <span class="font-medium text-foreground">{{ o.name }}</span>
              <span class="text-secondary-foreground">
                <template v-if="o.mode === 'created'">Created new Epicstory project</template>
                <template v-else>
                  Mapped to
                  {{ epicById.get(o.epicProjectId)?.name ?? `project #${o.epicProjectId}` }}
                </template>
              </span>
            </li>
          </ul>
        </div>
      </section>

      <!-- Mismatches -->
      <section
        v-if="mismatchesByType.length"
        class="mt-4 rounded-lg border border-border bg-card p-4 shadow-sm"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-sm font-medium">Mismatches</h2>
            <Badge size="xs" variant="soft" intent="warning">{{ mismatches.length }}</Badge>
          </div>
          <Button variant="ghost" size="xs" @click="downloadMismatches">Download JSON</Button>
        </div>
        <div class="mt-3 space-y-4">
          <div v-for="group of mismatchesByType" :key="group.type">
            <div class="flex items-center gap-2 text-sm">
              <span class="font-medium capitalize">{{ humanMismatchType(group.type) }}</span>
              <span class="text-xs text-secondary-foreground">{{ group.count }}</span>
            </div>
            <ul class="mt-1.5 space-y-1 border-l-2 border-border pl-3">
              <li
                v-for="m of group.items"
                :key="m.id"
                class="text-xs text-secondary-foreground leading-relaxed"
              >
                {{ m.message }}
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  </ScrollArea>
</template>
