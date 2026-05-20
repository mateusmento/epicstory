<script setup lang="ts">
import { config } from "@/config";
import { Button } from "@/design-system";
import { useDependency } from "@/core/dependency-injection";
import { GithubIntegrationApi, WorkspaceApi } from "@epicstory/api-client";
import type { IGithubProjectRepoLink, IGithubRepositoryCatalogPage, Project } from "@epicstory/contracts";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter, type LocationQueryValue } from "vue-router";

const route = useRoute();
const router = useRouter();
const api = useDependency(GithubIntegrationApi);
const workspaceApi = useDependency(WorkspaceApi);

const workspaceId = computed(() => Number(route.params.workspaceId));

const loading = ref(false);
const status = ref<Awaited<ReturnType<typeof api.getStatus>>>();

const projectsLoading = ref(false);
const projects = ref<Project[]>([]);
const projectsError = ref<string | null>(null);
const selectedProjectId = ref<number | null>(null);

const projectRepos = ref<IGithubProjectRepoLink[]>([]);
const projectReposLoading = ref(false);
const projectReposError = ref<string | null>(null);
const linkError = ref<string | null>(null);
const linkActionKey = ref<string | null>(null);
const primaryActionId = ref<number | null>(null);

const catalogLoading = ref(false);
const catalog = ref<IGithubRepositoryCatalogPage | null>(null);
const catalogError = ref<string | null>(null);

const oauthBannerError = ref<string | null>(null);
const oauthBannerSuccess = ref(false);

function queryParamFirst(
  v: LocationQueryValue | LocationQueryValue[] | undefined | null,
): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) {
    const first = v.find((item): item is string => typeof item === "string");
    return first;
  }
  return typeof v === "string" ? v : undefined;
}

/** OAuth callback redirects here with query params instead of JSON errors. */
function consumeGithubOAuthQueryParams() {
  const hasKeys = route.query.github_oauth_error != null || route.query.github_oauth_success != null;
  if (!hasKeys) return;

  const err = queryParamFirst(route.query.github_oauth_error);
  const ok = queryParamFirst(route.query.github_oauth_success);
  oauthBannerError.value = err?.trim() ? err.trim() : null;
  oauthBannerSuccess.value = ok === "1" || ok === "true";

  const nextQuery = { ...route.query };
  delete nextQuery.github_oauth_error;
  delete nextQuery.github_oauth_success;
  router.replace({ path: route.path, query: nextQuery });
}

watch(
  () => [route.query.github_oauth_error, route.query.github_oauth_success] as const,
  () => consumeGithubOAuthQueryParams(),
);

function extractApiError(e: unknown, fallback: string) {
  const msg =
    e &&
    typeof e === "object" &&
    "response" in e &&
    e.response &&
    typeof e.response === "object" &&
    "data" in e.response &&
    e.response.data &&
    typeof e.response.data === "object" &&
    "message" in e.response.data
      ? (e.response.data as { message: unknown }).message
      : e instanceof Error
        ? e.message
        : fallback;
  return Array.isArray(msg) ? msg.join(", ") : String(msg);
}

function installStartUrl() {
  const redirect = `/${workspaceId.value}/settings/integrations/github`;
  const url = new URL(`${config.API_URL}/integrations/github/install/start`);
  url.searchParams.set("workspaceId", String(workspaceId.value));
  url.searchParams.set("redirect", redirect);
  return url.toString();
}

function userOAuthStartUrl() {
  const redirect = `/${workspaceId.value}/settings/integrations/github`;
  const url = new URL(`${config.API_URL}/integrations/github/user/start`);
  url.searchParams.set("workspaceId", String(workspaceId.value));
  url.searchParams.set("redirect", redirect);
  return url.toString();
}

const installCallbackPath = computed(
  () => `${config.API_URL.replace(/\/$/, "")}/integrations/github/install/callback`,
);
const userCallbackPath = computed(
  () => `${config.API_URL.replace(/\/$/, "")}/integrations/github/user/callback`,
);

async function refresh() {
  loading.value = true;
  try {
    status.value = await api.getStatus(workspaceId.value);
    catalog.value = null;
    catalogError.value = null;
  } finally {
    loading.value = false;
  }
}

async function loadProjects() {
  projectsLoading.value = true;
  projectsError.value = null;
  try {
    const page = await workspaceApi.findProjects(workspaceId.value, { count: 100 });
    projects.value = page.content;
    if (projects.value.length && selectedProjectId.value == null) {
      selectedProjectId.value = projects.value[0]!.id;
    }
  } catch (e: unknown) {
    projects.value = [];
    projectsError.value = extractApiError(e, "Could not load projects.");
  } finally {
    projectsLoading.value = false;
  }
}

async function loadProjectRepos() {
  const pid = selectedProjectId.value;
  if (pid == null) {
    projectRepos.value = [];
    return;
  }
  projectReposLoading.value = true;
  projectReposError.value = null;
  try {
    projectRepos.value = await api.listProjectGithubRepos(workspaceId.value, pid);
  } catch (e: unknown) {
    projectRepos.value = [];
    projectReposError.value = extractApiError(e, "Could not load linked repositories.");
  } finally {
    projectReposLoading.value = false;
  }
}

watch(workspaceId, async () => {
  selectedProjectId.value = null;
  projectRepos.value = [];
  catalog.value = null;
  await Promise.all([refresh(), loadProjects()]);
});

watch(
  selectedProjectId,
  async (pid) => {
    if (pid != null) await loadProjectRepos();
    else projectRepos.value = [];
  },
  { immediate: true },
);

function isCatalogRepoLinked(repo: { githubRepoId: string }) {
  return projectRepos.value.some((l: IGithubProjectRepoLink) => l.githubRepoId === repo.githubRepoId);
}

async function loadCatalog(page = 1) {
  catalogLoading.value = true;
  catalogError.value = null;
  try {
    catalog.value = await api.listRepositories(workspaceId.value, {
      page,
      perPage: 20,
    });
  } catch (e: unknown) {
    catalogError.value = extractApiError(e, "Could not load repositories.");
    catalog.value = null;
  } finally {
    catalogLoading.value = false;
  }
}

async function loadMoreCatalog() {
  if (!catalog.value?.hasNextPage) return;
  catalogLoading.value = true;
  catalogError.value = null;
  try {
    const prev = catalog.value;
    const next = await api.listRepositories(workspaceId.value, {
      page: prev.page + 1,
      perPage: prev.perPage,
    });
    catalog.value = {
      totalCount: next.totalCount,
      page: next.page,
      perPage: next.perPage,
      hasNextPage: next.hasNextPage,
      repositories: [...prev.repositories, ...next.repositories],
    };
  } catch (e: unknown) {
    catalogError.value = e instanceof Error ? e.message : "Load failed.";
  } finally {
    catalogLoading.value = false;
  }
}

async function linkCatalogRepo(repo: { owner: string; name: string; githubRepoId: string }) {
  if (selectedProjectId.value == null) return;
  const key = repo.githubRepoId;
  linkActionKey.value = key;
  linkError.value = null;
  try {
    await api.linkProjectGithubRepo(workspaceId.value, selectedProjectId.value, {
      owner: repo.owner,
      name: repo.name,
    });
    await loadProjectRepos();
  } catch (e: unknown) {
    linkError.value = extractApiError(e, "Could not link repository.");
  } finally {
    linkActionKey.value = null;
  }
}

async function unlinkProjectRepo(linkId: number) {
  if (selectedProjectId.value == null) return;
  if (!confirm("Remove this repository link from the project?")) return;
  projectReposError.value = null;
  try {
    await api.unlinkProjectGithubRepo(workspaceId.value, selectedProjectId.value, linkId);
    await loadProjectRepos();
  } catch (e: unknown) {
    projectReposError.value = extractApiError(e, "Could not remove link.");
  }
}

async function setPrimaryProjectRepo(linkId: number) {
  if (selectedProjectId.value == null) return;
  primaryActionId.value = linkId;
  projectReposError.value = null;
  try {
    await api.setPrimaryProjectGithubRepo(workspaceId.value, selectedProjectId.value, linkId);
    await loadProjectRepos();
  } catch (e: unknown) {
    projectReposError.value = extractApiError(e, "Could not set default repository.");
  } finally {
    primaryActionId.value = null;
  }
}

async function disconnectInstallation() {
  if (!confirm("Remove the GitHub App installation from this workspace?")) return;
  loading.value = true;
  try {
    await api.disconnectInstallation(workspaceId.value);
    catalog.value = null;
    await refresh();
    await loadProjectRepos();
  } finally {
    loading.value = false;
  }
}

async function disconnectUser() {
  if (!confirm("Unlink your GitHub account from this workspace?")) return;
  loading.value = true;
  try {
    await api.disconnectUser(workspaceId.value);
    await refresh();
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  consumeGithubOAuthQueryParams();
  await Promise.all([refresh(), loadProjects()]);
});
</script>

<template>
  <div class="p-6 max-w-3xl">
    <div class="text-lg font-semibold">GitHub</div>
    <div class="text-sm text-secondary-foreground mt-1">
      Connect your workspace to GitHub (App installation + member authorization) to link repos and open pull
      requests from issues.
    </div>

    <div
      v-if="oauthBannerError"
      class="mt-4 rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {{ oauthBannerError }}
    </div>
    <div
      v-else-if="oauthBannerSuccess"
      class="mt-4 rounded-md border border-emerald-600/30 bg-emerald-600/5 px-3 py-2 text-sm text-emerald-950 dark:text-emerald-100"
    >
      GitHub account linked. You can create branches and pull requests from issues.
    </div>

    <div class="mt-6 border rounded-lg p-4">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex flex-col gap-1 min-w-0">
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

        <div class="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 shrink-0">
          <Button
            v-if="status?.appConfigured"
            variant="default"
            :disabled="loading"
            :as="'a'"
            :href="installStartUrl()"
          >
            Install GitHub App
          </Button>
          <Button
            v-if="status?.appConfigured"
            variant="outline"
            :disabled="loading"
            :as="'a'"
            :href="userOAuthStartUrl()"
          >
            Link your GitHub account
          </Button>
          <Button
            v-if="status?.installation"
            variant="destructive"
            :disabled="loading"
            @click="disconnectInstallation"
          >
            Remove installation
          </Button>
          <Button v-if="status?.user" variant="outline" :disabled="loading" @click="disconnectUser">
            Unlink GitHub account
          </Button>
          <Button variant="outline" :disabled="loading" @click="refresh"> Refresh </Button>
        </div>
      </div>
    </div>

    <div v-if="status?.installation" class="mt-6 border rounded-lg p-4">
      <div class="text-sm font-medium">Project repository links</div>
      <p class="text-xs text-secondary-foreground mt-1">
        Choose a project, then link installation catalogue entries below or manage links here.
      </p>
      <div v-if="projectsError" class="mt-2 text-sm text-destructive">
        {{ projectsError }}
      </div>
      <div v-if="projectsLoading" class="mt-2 text-sm text-secondary-foreground">Loading projects…</div>
      <div v-else class="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center">
        <label class="text-sm flex flex-col gap-1 min-w-0 flex-1">
          <span class="text-secondary-foreground">Project</span>
          <select
            v-model.number="selectedProjectId"
            class="border rounded-md px-2 py-1.5 text-sm bg-background"
            :disabled="!projects.length"
          >
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </label>
      </div>
      <div v-if="!projects.length && !projectsLoading" class="mt-2 text-sm text-secondary-foreground">
        No projects in this workspace yet. Create a project first.
      </div>
      <div v-if="projectReposError" class="mt-2 text-sm text-destructive">
        {{ projectReposError }}
      </div>
      <div v-if="linkError" class="mt-2 text-sm text-destructive">
        {{ linkError }}
      </div>
      <div
        v-if="selectedProjectId != null && projectReposLoading"
        class="mt-3 text-sm text-secondary-foreground"
      >
        Loading links…
      </div>
      <ul
        v-if="selectedProjectId != null && projectRepos.length && !projectReposLoading"
        class="mt-3 border rounded-md divide-y"
      >
        <li
          v-for="l in projectRepos"
          :key="l.id"
          class="px-3 py-2 text-sm flex flex-row items-center justify-between gap-2"
        >
          <div class="min-w-0">
            <div class="font-medium truncate flex flex-wrap items-center gap-2">
              <span>{{ l.fullName }}</span>
              <span
                v-if="l.isPrimary"
                class="text-xs font-normal text-primary border border-primary/30 rounded px-1.5 py-0"
                >Default</span
              >
            </div>
            <div class="text-xs text-secondary-foreground truncate">
              default branch: {{ l.defaultBranch ?? "—" }}
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              v-if="!l.isPrimary"
              variant="secondary"
              size="sm"
              :disabled="loading || primaryActionId === l.id"
              @click="setPrimaryProjectRepo(l.id)"
            >
              {{ primaryActionId === l.id ? "Saving…" : "Set as default" }}
            </Button>
            <Button variant="outline" size="sm" :disabled="loading" @click="unlinkProjectRepo(l.id)">
              Remove
            </Button>
          </div>
        </li>
      </ul>
      <div
        v-if="selectedProjectId != null && !projectReposLoading && !projectRepos.length && projects.length"
        class="mt-3 text-sm text-secondary-foreground"
      >
        No repositories linked to this project yet.
      </div>
    </div>

    <div v-if="status?.installation" class="mt-6 border rounded-lg p-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="text-sm font-medium">Repositories (installation catalogue)</div>
        <Button variant="outline" size="sm" :disabled="catalogLoading" @click="loadCatalog(1)">
          {{ catalog ? "Reload" : "Load repositories" }}
        </Button>
      </div>
      <p class="text-xs text-secondary-foreground mt-1">
        Repos your GitHub App can access on this installation. Select a project above, then use Link on a row
        to attach a repo to that project.
      </p>
      <div v-if="catalogError" class="mt-3 text-sm text-destructive">
        {{ catalogError }}
      </div>
      <div v-if="catalogLoading && !catalog" class="mt-3 text-sm text-secondary-foreground">Loading…</div>
      <ul v-if="catalog?.repositories.length" class="mt-3 border rounded-md divide-y max-h-72 overflow-auto">
        <li
          v-for="r in catalog.repositories"
          :key="r.githubRepoId"
          class="px-3 py-2 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
        >
          <div class="flex flex-col gap-0.5 min-w-0">
            <a
              :href="r.htmlUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="font-medium text-primary hover:underline truncate"
              >{{ r.fullName }}</a
            >
            <span class="text-xs text-secondary-foreground">
              default: {{ r.defaultBranch ?? "—" }} · {{ r.private ? "private" : "public" }}
            </span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span v-if="isCatalogRepoLinked(r)" class="text-xs text-secondary-foreground">Linked</span>
            <Button
              v-else
              variant="secondary"
              size="sm"
              :disabled="
                catalogLoading ||
                selectedProjectId == null ||
                !projects.length ||
                linkActionKey === r.githubRepoId
              "
              @click="linkCatalogRepo(r)"
            >
              {{ linkActionKey === r.githubRepoId ? "Linking…" : "Link" }}
            </Button>
          </div>
        </li>
      </ul>
      <div v-if="catalog && !catalog.repositories.length" class="mt-3 text-sm text-secondary-foreground">
        No repositories returned (check app repository permissions on GitHub).
      </div>
      <div v-if="catalog?.hasNextPage" class="mt-3">
        <Button variant="ghost" size="sm" :disabled="catalogLoading" @click="loadMoreCatalog">
          Load more ({{ catalog.repositories.length }} / {{ catalog.totalCount }})
        </Button>
      </div>
    </div>

    <p class="mt-4 text-sm text-secondary-foreground">
      In GitHub → App settings: <strong class="font-medium text-foreground">Setup URL</strong> (after install)
      should be <code class="text-xs">{{ installCallbackPath }}</code
      >; <strong class="font-medium text-foreground">User authorization callback</strong> should be
      <code class="text-xs">{{ userCallbackPath }}</code
      >. If both point at the user URL, installs still work after a server update, but fixing the Setup URL
      avoids confusion. Add <code class="text-xs">GITHUB_APP_SLUG</code> and
      <code class="text-xs">GITHUB_APP_PRIVATE_KEY</code> in the API environment so installs resolve the org
      or user account name and the repo catalogue can load.
    </p>
  </div>
</template>
