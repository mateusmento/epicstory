import { useDependency } from "@/core/dependency-injection";
import { GithubIntegrationApi } from "@epicstory/api-client";
import type { IGithubIntegrationStatus } from "@epicstory/contracts";
import type { Ref } from "vue";
import { computed, markRaw, reactive, watch } from "vue";
import type { GithubIntegrationAccess } from "@/lib/github";
import { githubApiErrorMessage } from "../github-api-errors";
import { useGithubRepositoryCatalog } from "./use-github-repository-catalog";
import { useGithubWorkspaceAccess } from "./use-github-workspace-access";

export function useGithubIntegrationContext(workspaceId: Ref<string>) {
  const githubIntegrationApi = useDependency(GithubIntegrationApi);
  const catalog = useGithubRepositoryCatalog({ pageSize: 100 });
  const { canManageGithubSetup } = useGithubWorkspaceAccess(workspaceId);

  const integrationStatus = reactive({
    data: null as IGithubIntegrationStatus | null,
    loading: false,
    error: null as string | null,
  });

  const githubWorkspaceEnabled = computed(() => Boolean(integrationStatus.data?.installation));

  const memberAccountLinked = computed(() => integrationStatus.data?.user != null);

  const showGithubSection = computed(() => {
    if (integrationStatus.loading) return true;
    return githubWorkspaceEnabled.value;
  });

  const workflowFormVisible = computed(() => githubWorkspaceEnabled.value && memberAccountLinked.value);

  const githubAdminNeedsWorkspaceInstall = computed(
    () =>
      canManageGithubSetup.value &&
      !integrationStatus.loading &&
      integrationStatus.data != null &&
      !githubWorkspaceEnabled.value,
  );

  const githubMemberNeedsAccountLink = computed(
    () => githubWorkspaceEnabled.value && !memberAccountLinked.value,
  );

  const installationMissingOnGithub = computed(
    () => integrationStatus.data?.installationRemoteVerification === "missing_on_github",
  );

  const access = computed(
    (): GithubIntegrationAccess => ({
      adminNeedsWorkspaceInstall: githubAdminNeedsWorkspaceInstall.value,
      memberNeedsAccountLink: githubMemberNeedsAccountLink.value,
      settingsRoute: {
        name: "github-integration-settings" as const,
        params: { workspaceId: workspaceId.value },
      },
    }),
  );

  async function refreshStatus(): Promise<boolean> {
    const wid = workspaceId.value;
    if (!wid) return false;
    integrationStatus.loading = true;
    integrationStatus.error = null;
    try {
      integrationStatus.data = await githubIntegrationApi.getStatus(+wid);
      return true;
    } catch (e: unknown) {
      integrationStatus.data = null;
      integrationStatus.error = githubApiErrorMessage(e, "Could not load GitHub integration status");
      return false;
    } finally {
      integrationStatus.loading = false;
    }
  }

  async function loadCatalog(): Promise<void> {
    const wid = workspaceId.value;
    if (!wid || !integrationStatus.data?.installation) return;
    await catalog.load(+wid);
  }

  watch(
    workspaceId,
    async (wid) => {
      integrationStatus.data = null;
      integrationStatus.error = null;
      catalog.reset();
      if (!wid) return;
      await refreshStatus();
    },
    { immediate: true },
  );

  watch(
    () => integrationStatus.data?.installation?.id,
    async (installationId) => {
      if (installationId == null) {
        catalog.reset();
        return;
      }
      await loadCatalog();
    },
  );

  return reactive({
    integrationStatus,
    catalog,
    access,
    showGithubSection,
    workflowFormVisible,
    installationMissingOnGithub,
    memberAccountLinked,
    canManageGithubSetup,
    refreshStatus: markRaw(refreshStatus),
    loadCatalog: markRaw(loadCatalog),
  });
}

export type GithubIntegrationContext = ReturnType<typeof useGithubIntegrationContext>;
