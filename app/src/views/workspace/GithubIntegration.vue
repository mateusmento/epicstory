<script setup lang="ts">
import { config } from "@/config";
import { Button } from "@/design-system";
import { useDependency } from "@/core/dependency-injection";
import { GithubIntegrationApi } from "@epicstory/api-client";
import type { IGithubRepositoryCatalogPage } from "@epicstory/contracts";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const api = useDependency(GithubIntegrationApi);

const workspaceId = computed(() => Number(route.params.workspaceId));

const loading = ref(false);
const status = ref<Awaited<ReturnType<typeof api.getStatus>>>();

const catalogLoading = ref(false);
const catalog = ref<IGithubRepositoryCatalogPage | null>(null);
const catalogError = ref<string | null>(null);

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

async function loadCatalog(page = 1) {
  catalogLoading.value = true;
  catalogError.value = null;
  try {
    catalog.value = await api.listRepositories(workspaceId.value, {
      page,
      perPage: 20,
    });
  } catch (e: unknown) {
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
        ? String((e.response.data as { message: unknown }).message)
        : e instanceof Error
          ? e.message
          : "Could not load repositories.";
    catalogError.value = Array.isArray(msg) ? msg.join(", ") : msg;
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

async function disconnectInstallation() {
  if (!confirm("Remove the GitHub App installation from this workspace?")) return;
  loading.value = true;
  try {
    await api.disconnectInstallation(workspaceId.value);
    catalog.value = null;
    await refresh();
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
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="text-sm font-medium">Repositories (installation catalogue)</div>
        <Button variant="outline" size="sm" :disabled="catalogLoading" @click="loadCatalog(1)">
          {{ catalog ? "Reload" : "Load repositories" }}
        </Button>
      </div>
      <p class="text-xs text-secondary-foreground mt-1">
        Repos your GitHub App can access on this installation. Project linking comes next.
      </p>
      <div v-if="catalogError" class="mt-3 text-sm text-destructive">
        {{ catalogError }}
      </div>
      <div v-if="catalogLoading && !catalog" class="mt-3 text-sm text-secondary-foreground">Loading…</div>
      <ul v-if="catalog?.repositories.length" class="mt-3 border rounded-md divide-y max-h-72 overflow-auto">
        <li
          v-for="r in catalog.repositories"
          :key="r.githubRepoId"
          class="px-3 py-2 text-sm flex flex-col gap-0.5"
        >
          <a
            :href="r.htmlUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="font-medium text-primary hover:underline"
            >{{ r.fullName }}</a
          >
          <span class="text-xs text-secondary-foreground">
            default: {{ r.defaultBranch ?? "—" }} · {{ r.private ? "private" : "public" }}
          </span>
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
      In GitHub → App settings, set the installation callback URL to match your API’s install handler, and the
      user OAuth callback for member linking. Add <code class="text-xs">GITHUB_APP_SLUG</code> and
      <code class="text-xs">GITHUB_APP_PRIVATE_KEY</code> in the API environment so installs resolve the org
      or user account name and the repo catalogue can load.
    </p>
  </div>
</template>
