<script setup lang="ts">
import { config } from "@/config";
import { Button } from "@/design-system";
import { useDependency } from "@/core/dependency-injection";
import { GithubIntegrationApi } from "@epicstory/api-client";
import { useAuth } from "@/domain/auth";
import { clearGithubIssueWorkflowPendingForWorkspace, useGithubRepositoryCatalog } from "@/domain/github";
import { useWorkspace } from "@/domain/workspace";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter, type LocationQueryValue } from "vue-router";

const route = useRoute();
const router = useRouter();
const api = useDependency(GithubIntegrationApi);
const { user: authUser } = useAuth();
const { members: workspaceMembers, fetchWorkspaceMembers } = useWorkspace();

const workspaceId = computed(() => Number(route.params.workspaceId));

/** Workspace install/remove is admin-only (API enforces the same). */
const canManageGithubInstallation = computed(() => {
  const uid = authUser.value?.id;
  if (uid == null) return false;
  const row = workspaceMembers.value.find((m) => m.userId === uid);
  if (!row) return false;
  return row.role === 0 || row.role === 1;
});

const loading = ref(false);
const status = ref<Awaited<ReturnType<typeof api.getStatus>>>();

const catalog = useGithubRepositoryCatalog({ pageSize: 20 });
const catalogSectionEl = ref<HTMLElement | null>(null);

const oauthBannerError = ref<string | null>(null);
const oauthBannerSuccess = ref(false);
const githubPageHeadingEl = ref<HTMLElement | null>(null);

function resetOauthBannerState() {
  oauthBannerError.value = null;
  oauthBannerSuccess.value = false;
}

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
  const hasKeys =
    route.query.github_oauth_error != null ||
    route.query.github_oauth_success != null ||
    route.query.github_install_success != null;
  if (!hasKeys) return;

  const err = queryParamFirst(route.query.github_oauth_error);
  const ok = queryParamFirst(route.query.github_oauth_success);
  const installOk = queryParamFirst(route.query.github_install_success);
  oauthBannerError.value = err?.trim() ? err.trim() : null;
  oauthBannerSuccess.value = ok === "1" || ok === "true" || installOk === "1" || installOk === "true";

  const nextQuery = { ...route.query };
  delete nextQuery.github_oauth_error;
  delete nextQuery.github_oauth_success;
  delete nextQuery.github_install_success;
  router.replace({ path: route.path, query: nextQuery });

  nextTick(() => {
    if (oauthBannerError.value !== null || oauthBannerSuccess.value) {
      githubPageHeadingEl.value?.focus({ preventScroll: true });
    }
  });
}

watch(
  () =>
    [
      route.query.github_oauth_error,
      route.query.github_oauth_success,
      route.query.github_install_success,
    ] as const,
  () => consumeGithubOAuthQueryParams(),
);

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
/** Must match GitHub App → Callback URL exactly (same scheme/host/path as API `redirect_uri`). */
const userAuthorizationCallbackUrl = computed(
  () => `${config.API_URL.replace(/\/$/, "")}/integrations/github/user/callback`,
);

async function refresh() {
  loading.value = true;
  try {
    status.value = await api.getStatus(workspaceId.value);
    catalog.reset();
  } finally {
    loading.value = false;
  }
}

watch(workspaceId, async () => {
  catalog.reset();
  await refresh();
});

async function reloadCatalog() {
  await catalog.load(workspaceId.value, "Could not load repositories.");
  if (catalog.error) {
    nextTick(() => catalogSectionEl.value?.focus({ preventScroll: true }));
  }
}

async function disconnectInstallation() {
  if (!confirm("Remove the GitHub App installation from this workspace?")) return;
  loading.value = true;
  try {
    resetOauthBannerState();
    await api.disconnectInstallation(workspaceId.value);
    clearGithubIssueWorkflowPendingForWorkspace(String(workspaceId.value));
    catalog.reset();
    await refresh();
  } finally {
    loading.value = false;
  }
}

async function disconnectUser() {
  if (!confirm("Unlink your GitHub account from this workspace?")) return;
  loading.value = true;
  try {
    resetOauthBannerState();
    await api.disconnectUser(workspaceId.value);
    clearGithubIssueWorkflowPendingForWorkspace(String(workspaceId.value));
    await refresh();
  } finally {
    loading.value = false;
  }
}

watch(
  () => status.value?.installation,
  (installed) => {
    if (installed && catalog.items.length === 0 && !catalog.loading) {
      catalog.load(workspaceId.value, "Could not load repositories.");
    }
  },
);

onMounted(async () => {
  consumeGithubOAuthQueryParams();
  await Promise.all([refresh(), fetchWorkspaceMembers()]);
  if (status.value?.installation) {
    await catalog.load(workspaceId.value, "Could not load repositories.");
  }
});
</script>

<template>
  <div class="p-6 max-w-3xl">
    <div
      ref="githubPageHeadingEl"
      id="github-integration-heading"
      tabindex="-1"
      class="text-lg font-semibold outline-none"
    >
      GitHub
    </div>
    <div class="text-sm text-secondary-foreground mt-1">
      Workspace admins install the GitHub App once. Each member links their own GitHub account before creating
      branches or pull requests from issues.
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
      GitHub is ready. Choose a repository on each issue when you create a branch or open a pull request.
    </div>

    <div
      v-if="status && status.installation && status.installationRemoteVerification === 'missing_on_github'"
      class="mt-4 rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      GitHub no longer has this workspace&apos;s installation. Repository catalogue and automation will fail
      until a workspace admin reinstalls the app (Integrations → GitHub → Install).
    </div>
    <div
      v-if="status && status.installation && status.installationRemoteVerification === 'error'"
      class="mt-4 rounded-md border border-amber-600/35 bg-amber-500/5 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
    >
      Could not verify the GitHub installation right now.
      <span v-if="status.installationRemoteVerificationDetail">{{
        " " + status.installationRemoteVerificationDetail
      }}</span>
    </div>

    <div
      v-if="status?.appConfigured"
      class="mt-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-secondary-foreground"
    >
      <span class="font-medium text-foreground">GitHub App → Callback URL</span> must include exactly:
      <code class="block mt-1 text-[11px] break-all">{{ userAuthorizationCallbackUrl }}</code>
      (Member branch/PR uses this <code class="text-[11px]">redirect_uri</code> on
      <a
        href="https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app"
        target="_blank"
        rel="noopener noreferrer"
        class="text-primary underline"
        >GitHub user authorization</a
      >.)
    </div>

    <div class="mt-6 border rounded-lg p-4">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <div class="text-sm font-medium">Status</div>
          <div v-if="!status" class="text-sm text-secondary-foreground">Loading…</div>
          <template v-else>
            <div class="text-sm text-secondary-foreground">
              GitHub App env:
              <span class="font-medium">{{ status.appConfigured ? "configured" : "not configured" }}</span>
            </div>
            <template v-if="status.installation">
              <div class="text-sm text-secondary-foreground">
                Workspace install:
                <span class="font-medium">{{ status.installation.accountLogin }}</span>
                ({{ status.installation.accountType }})
              </div>
              <div
                v-if="status.installation.suspendedAt"
                class="text-sm text-amber-800 dark:text-amber-200 mt-2"
              >
                This installation is suspended on GitHub (suspended_at). Org admins must unsuspend before the
                app can access repositories.
              </div>
            </template>
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

        <div class="flex flex-wrap gap-2 pt-1 border-t border-border">
          <Button
            v-if="status?.appConfigured && canManageGithubInstallation"
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
            v-if="status?.installation && canManageGithubInstallation"
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

    <div
      v-if="status?.installation"
      ref="catalogSectionEl"
      tabindex="-1"
      class="mt-6 border rounded-lg p-4 outline-none"
    >
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="text-sm font-medium">Workspace repositories</div>
        <Button variant="outline" size="sm" :disabled="catalog.loading" @click="reloadCatalog">
          {{ catalog.items.length > 0 ? "Reload" : "Load repositories" }}
        </Button>
      </div>
      <p class="text-xs text-secondary-foreground mt-1">
        Repositories your GitHub App can access for this workspace (org or personal account). Members pick a
        repo on each issue when creating branches or pull requests.
      </p>
      <div v-if="catalog.error" class="mt-3 text-sm text-destructive">
        {{ catalog.error }}
      </div>
      <div
        v-if="catalog.loading && catalog.items.length === 0"
        class="mt-3 text-sm text-secondary-foreground"
      >
        Loading…
      </div>
      <ul v-if="catalog.items.length" class="mt-3 border rounded-md divide-y max-h-72 overflow-auto">
        <li
          v-for="r in catalog.items"
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
        </li>
      </ul>
      <div
        v-if="catalog.hasLoaded && !catalog.loading && catalog.items.length === 0 && !catalog.error"
        class="mt-3 text-sm text-secondary-foreground"
      >
        No repositories returned (check app repository permissions on GitHub).
      </div>
      <div v-if="catalog.hasMore" class="mt-3">
        <Button
          variant="ghost"
          size="sm"
          :disabled="catalog.loadingMore"
          @click="catalog.loadMore(workspaceId, 'Load failed.')"
        >
          Load more ({{ catalog.items.length }} / {{ catalog.totalCount }})
        </Button>
      </div>
    </div>

    <p class="mt-4 text-sm text-secondary-foreground">
      In GitHub → App settings: <strong class="font-medium text-foreground">Setup URL</strong> (after install)
      should be <code class="text-xs">{{ installCallbackPath }}</code
      >; <strong class="font-medium text-foreground">User authorization callback</strong> should be
      <code class="text-xs">{{ userAuthorizationCallbackUrl }}</code
      >. If both point at the user URL, installs still work after a server update, but fixing the Setup URL
      avoids confusion. Add <code class="text-xs">GITHUB_APP_SLUG</code> and
      <code class="text-xs">GITHUB_APP_PRIVATE_KEY</code> in the API environment so installs resolve the org
      or user account name and the repo catalogue can load.
    </p>
  </div>
</template>
