<script setup lang="ts">
import { config } from "@/config";
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  ScrollArea,
} from "@/design-system";
import { useDependency } from "@/core/dependency-injection";
import { GithubIntegrationApi } from "@epicstory/api-client";
import { useAuth } from "@/domain/auth";
import { clearGithubIssueWorkflowPendingForWorkspace, useGithubRepositoryCatalog } from "@/domain/github";
import { useConfirmDialog } from "@/presentationals/confirm-dialog";
import { useWorkspace } from "@/domain/workspace";
import type { BadgeIntent } from "@/design-system";
import { Loader2, RefreshCw, ChevronDown } from "lucide-vue-next";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter, type LocationQueryValue } from "vue-router";
import { toast } from "vue-sonner";

const route = useRoute();
const router = useRouter();
const api = useDependency(GithubIntegrationApi);
const { user: authUser } = useAuth();
const { members: workspaceMembers, fetchWorkspaceMembers } = useWorkspace();
const confirmDialog = useConfirmDialog();

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
const githubPageHeadingEl = ref<HTMLElement | null>(null);

const installation = computed(() => status.value?.installation ?? null);
const linkedUser = computed(() => status.value?.user ?? null);
const appConfigured = computed(() => status.value?.appConfigured === true);

const installBadge = computed((): { label: string; intent: BadgeIntent } | null => {
  if (!status.value) return null;
  if (!installation.value) {
    return { label: "Not installed", intent: "secondary" };
  }
  if (status.value.installationRemoteVerification === "missing_on_github") {
    return { label: "Broken on GitHub", intent: "destructive" };
  }
  if (installation.value.suspendedAt) {
    return { label: "Suspended", intent: "warning" };
  }
  return { label: "Installed", intent: "success" };
});

const accountBadge = computed((): { label: string; intent: BadgeIntent } | null => {
  if (!status.value) return null;
  return linkedUser.value
    ? { label: "Linked", intent: "success" }
    : { label: "Not linked", intent: "secondary" };
});

const showPrimaryInstall = computed(
  () => appConfigured.value && canManageGithubInstallation.value && !installation.value,
);

const showPrimaryLink = computed(() => appConfigured.value && !!installation.value && !linkedUser.value);

const showInstallReadyHint = computed(
  () => !!installation.value && !!linkedUser.value && appConfigured.value,
);

function resetOauthBannerState() {
  oauthBannerError.value = null;
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
  const success = ok === "1" || ok === "true" || installOk === "1" || installOk === "true";

  oauthBannerError.value = err?.trim() ? err.trim() : null;

  const nextQuery = { ...route.query };
  delete nextQuery.github_oauth_error;
  delete nextQuery.github_oauth_success;
  delete nextQuery.github_install_success;
  router.replace({ path: route.path, query: nextQuery });

  if (success && !oauthBannerError.value) {
    toast.success("GitHub is ready", {
      description: "Choose a repository on each issue when you create a branch or open a pull request.",
    });
  }

  nextTick(() => {
    if (oauthBannerError.value !== null || success) {
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
    toast.error(catalog.error);
    nextTick(() => catalogSectionEl.value?.focus({ preventScroll: true }));
  }
}

async function disconnectInstallation() {
  const confirmed = await confirmDialog.open({
    title: "Remove GitHub installation?",
    description:
      "This removes the GitHub App from this workspace. Members will not be able to create branches or pull requests until an admin reinstalls.",
    confirmLabel: "Remove installation",
    cancelLabel: "Cancel",
    destructive: true,
  });
  if (!confirmed) return;
  loading.value = true;
  try {
    resetOauthBannerState();
    await api.disconnectInstallation(workspaceId.value);
    clearGithubIssueWorkflowPendingForWorkspace(String(workspaceId.value));
    catalog.reset();
    await refresh();
    toast.success("GitHub installation removed");
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "Could not remove installation.");
  } finally {
    loading.value = false;
  }
}

async function disconnectUser() {
  const confirmed = await confirmDialog.open({
    title: "Unlink your GitHub account?",
    description:
      "You will need to link again before creating branches or pull requests from issues in this workspace.",
    confirmLabel: "Unlink",
    cancelLabel: "Cancel",
    destructive: true,
  });
  if (!confirmed) return;
  loading.value = true;
  try {
    resetOauthBannerState();
    await api.disconnectUser(workspaceId.value);
    clearGithubIssueWorkflowPendingForWorkspace(String(workspaceId.value));
    await refresh();
    toast.success("GitHub account unlinked");
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "Could not unlink GitHub account.");
  } finally {
    loading.value = false;
  }
}

async function loadMoreRepositories() {
  await catalog.loadMore(workspaceId.value, "Could not load more repositories.");
  if (catalog.error) toast.error(catalog.error);
}

watch(
  () => status.value?.installation,
  (installed) => {
    if (installed && catalog.items.length === 0 && !catalog.loading) {
      catalog.load(workspaceId.value, "Could not load repositories.").then(() => {
        if (catalog.error) toast.error(catalog.error);
      });
    }
  },
);

onMounted(async () => {
  consumeGithubOAuthQueryParams();
  await Promise.all([refresh(), fetchWorkspaceMembers()]);
  if (status.value?.installation) {
    await catalog.load(workspaceId.value, "Could not load repositories.");
    if (catalog.error) toast.error(catalog.error);
  }
});
</script>

<template>
  <ScrollArea class="min-h-0 flex-1">
    <div class="!block max-w-3xl p-6 pb-10">
      <div
        ref="githubPageHeadingEl"
        id="github-integration-heading"
        tabindex="-1"
        class="text-lg font-semibold outline-none"
      >
        GitHub
      </div>
      <div class="text-sm text-secondary-foreground mt-1">
        Workspace admins install the GitHub App once. Each member links their own GitHub account before
        creating branches or pull requests from issues.
      </div>

      <div
        v-if="oauthBannerError"
        class="mt-4 rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        role="alert"
      >
        {{ oauthBannerError }}
      </div>

      <!-- Workspace installation -->
      <section class="mt-6 rounded-lg border bg-card shadow-sm">
        <div class="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-sm font-medium">Workspace installation</h2>
              <Badge v-if="installBadge" size="xs" variant="soft" :intent="installBadge.intent">
                {{ installBadge.label }}
              </Badge>
              <Badge v-if="status" size="xs" variant="soft" :intent="appConfigured ? 'success' : 'secondary'">
                {{ appConfigured ? "App ready" : "App not configured" }}
              </Badge>
            </div>
            <p class="mt-1 text-xs text-secondary-foreground">
              Admins install the app on a GitHub org or user account so this workspace can see repositories.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            class="shrink-0"
            :disabled="loading"
            aria-label="Refresh GitHub status"
            @click="refresh"
          >
            <Loader2 v-if="loading" class="size-4 animate-spin" />
            <RefreshCw v-else class="size-4" />
          </Button>
        </div>

        <div class="space-y-3 p-4">
          <div v-if="!status" class="flex items-center gap-2 text-sm text-secondary-foreground">
            <Loader2 class="size-4 animate-spin" />
            Loading…
          </div>
          <template v-else>
            <p v-if="!appConfigured" class="text-sm text-secondary-foreground">
              Platform operators must set GitHub App env vars on the API before installs work. Open Setup for
              operators below for callback URLs.
            </p>

            <template v-else-if="installation">
              <div class="text-sm">
                <span class="font-medium">{{ installation.accountLogin }}</span>
                <span class="text-secondary-foreground"> · {{ installation.accountType }}</span>
              </div>

              <div
                v-if="status.installationRemoteVerification === 'missing_on_github'"
                class="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                GitHub no longer has this workspace&apos;s installation. Reinstall the app to restore the
                repository catalogue and automation.
              </div>
              <div
                v-else-if="status.installationRemoteVerification === 'error'"
                class="rounded-md border border-amber-600/35 bg-amber-500/5 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
                role="status"
              >
                Could not verify the GitHub installation right now.
                <span v-if="status.installationRemoteVerificationDetail">{{
                  " " + status.installationRemoteVerificationDetail
                }}</span>
              </div>
              <div
                v-else-if="installation.suspendedAt"
                class="rounded-md border border-amber-600/35 bg-amber-500/5 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
                role="status"
              >
                This installation is suspended on GitHub. Org admins must unsuspend the app before
                repositories are accessible.
              </div>
            </template>
            <p v-else class="text-sm text-secondary-foreground">No workspace installation yet.</p>

            <div
              v-if="canManageGithubInstallation"
              class="flex flex-wrap items-center gap-2 border-t border-border pt-3"
            >
              <Button
                v-if="showPrimaryInstall || status.installationRemoteVerification === 'missing_on_github'"
                variant="flat"
                :disabled="loading"
                :as="'a'"
                :href="installStartUrl()"
              >
                {{
                  status.installationRemoteVerification === "missing_on_github"
                    ? "Reinstall GitHub App"
                    : "Install GitHub App"
                }}
              </Button>
              <Button
                v-else-if="installation && appConfigured"
                variant="outline"
                size="sm"
                :disabled="loading"
                :as="'a'"
                :href="installStartUrl()"
              >
                Reinstall
              </Button>
              <Button
                v-if="installation"
                variant="outline"
                intent="destructive"
                size="sm"
                :disabled="loading"
                @click="disconnectInstallation"
              >
                Remove installation
              </Button>
            </div>
            <p
              v-else-if="!installation && appConfigured"
              class="text-xs text-secondary-foreground border-t border-border pt-3"
            >
              Ask a workspace admin to install the GitHub App.
            </p>
          </template>
        </div>
      </section>

      <!-- Your GitHub account -->
      <section class="mt-4 rounded-lg border bg-card shadow-sm">
        <div class="border-b px-4 py-3">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-sm font-medium">Your GitHub account</h2>
            <Badge v-if="accountBadge" size="xs" variant="soft" :intent="accountBadge.intent">
              {{ accountBadge.label }}
            </Badge>
          </div>
          <p class="mt-1 text-xs text-secondary-foreground">
            Each member links their own account before creating branches or pull requests from issues.
          </p>
        </div>

        <div class="space-y-3 p-4">
          <div v-if="!status" class="flex items-center gap-2 text-sm text-secondary-foreground">
            <Loader2 class="size-4 animate-spin" />
            Loading…
          </div>
          <template v-else>
            <div v-if="linkedUser" class="text-sm">
              Linked as <span class="font-medium">{{ linkedUser.githubLogin }}</span>
            </div>
            <p v-else class="text-sm text-secondary-foreground">
              You have not linked your GitHub account yet.
            </p>

            <p v-if="showInstallReadyHint" class="text-xs text-secondary-foreground">
              Installation and account are ready. Pick a repository on each issue when you create a branch or
              open a pull request.
            </p>

            <div class="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Button
                v-if="showPrimaryLink"
                variant="flat"
                :disabled="loading || !installation"
                :as="'a'"
                :href="userOAuthStartUrl()"
              >
                Link your GitHub account
              </Button>
              <Button
                v-else-if="appConfigured && !linkedUser"
                variant="outline"
                size="sm"
                :disabled="loading || !installation"
                :as="'a'"
                :href="userOAuthStartUrl()"
              >
                Link your GitHub account
              </Button>
              <Button
                v-if="linkedUser"
                variant="outline"
                size="sm"
                :disabled="loading"
                @click="disconnectUser"
              >
                Unlink
              </Button>
            </div>
          </template>
        </div>
      </section>

      <!-- Repositories -->
      <section
        v-if="installation"
        ref="catalogSectionEl"
        tabindex="-1"
        class="mt-4 rounded-lg border bg-card shadow-sm outline-none"
      >
        <div class="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-sm font-medium">Repositories</h2>
              <span
                v-if="catalog.hasLoaded && catalog.totalCount > 0"
                class="text-xs text-secondary-foreground"
              >
                {{ catalog.items.length }} of {{ catalog.totalCount }}
              </span>
            </div>
            <p class="mt-1 text-xs text-secondary-foreground">
              Repositories this workspace&apos;s GitHub App can access. Members pick one on each issue for
              branches and pull requests.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            class="shrink-0"
            :disabled="catalog.loading"
            @click="reloadCatalog"
          >
            <Loader2 v-if="catalog.loading" class="mr-1.5 size-3.5 animate-spin" />
            {{ catalog.items.length > 0 ? "Reload" : "Load repositories" }}
          </Button>
        </div>

        <div class="p-4">
          <div
            v-if="catalog.error"
            class="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {{ catalog.error }}
          </div>

          <div
            v-else-if="catalog.loading && catalog.items.length === 0"
            class="flex items-center justify-center gap-2 py-8 text-sm text-secondary-foreground"
          >
            <Loader2 class="size-4 animate-spin" />
            Loading repositories…
          </div>

          <ul v-else-if="catalog.items.length" class="max-h-72 divide-y overflow-auto rounded-md border">
            <li
              v-for="r in catalog.items"
              :key="r.githubRepoId"
              class="flex flex-col gap-2 px-3 py-2.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="flex min-w-0 flex-col gap-1">
                <a
                  :href="r.htmlUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="truncate text-sm font-medium text-primary hover:underline"
                  >{{ r.fullName }}</a
                >
                <span class="text-xs text-secondary-foreground">
                  Default branch {{ r.defaultBranch ?? "—" }}
                </span>
              </div>
              <Badge
                size="xs"
                :variant="r.private ? 'soft' : 'outline'"
                :intent="r.private ? 'secondary' : 'default'"
                class="w-fit shrink-0"
              >
                {{ r.private ? "Private" : "Public" }}
              </Badge>
            </li>
          </ul>

          <div v-else-if="catalog.hasLoaded && !catalog.loading" class="py-8 text-center">
            <p class="text-sm font-medium">No repositories</p>
            <p class="mt-1 text-xs text-secondary-foreground">
              Check app repository access on GitHub, then reload.
            </p>
          </div>

          <div v-if="catalog.hasMore" class="mt-3 flex justify-center">
            <Button variant="outline" size="sm" :disabled="catalog.loadingMore" @click="loadMoreRepositories">
              <Loader2 v-if="catalog.loadingMore" class="mr-1.5 size-3.5 animate-spin" />
              Load more
              <span class="ml-1 text-secondary-foreground">
                ({{ catalog.items.length }} of {{ catalog.totalCount }})
              </span>
            </Button>
          </div>
        </div>
      </section>

      <!-- Operator setup (demoted) -->
      <Collapsible
        v-if="status && (!appConfigured || canManageGithubInstallation)"
        class="mt-4 rounded-lg border bg-card"
        :default-open="!appConfigured"
        v-slot="{ open }"
      >
        <CollapsibleTrigger
          class="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-muted/30"
        >
          Setup for operators
          <ChevronDown
            class="size-4 shrink-0 text-secondary-foreground transition-transform"
            :class="open ? 'rotate-180' : ''"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div class="space-y-3 border-t px-4 py-3 text-xs text-secondary-foreground">
            <p>
              These URLs belong in the GitHub App settings and API environment — not day-to-day member use.
            </p>
            <div>
              <span class="font-medium text-foreground">Setup URL</span> (after install):
              <code class="mt-1 block break-all text-[11px]">{{ installCallbackPath }}</code>
            </div>
            <div>
              <span class="font-medium text-foreground">User authorization callback</span>:
              <code class="mt-1 block break-all text-[11px]">{{ userAuthorizationCallbackUrl }}</code>
            </div>
            <p>
              Add <code class="text-[11px]">GITHUB_APP_SLUG</code> and
              <code class="text-[11px]">GITHUB_APP_PRIVATE_KEY</code> in the API environment so installs
              resolve the account name and the repository catalogue can load. See
              <a
                href="https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary underline"
                >GitHub user authorization</a
              >
              for how the callback URL is used.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  </ScrollArea>
</template>
