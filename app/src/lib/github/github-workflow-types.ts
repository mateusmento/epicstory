import type { AsyncMutationState } from "@/lib/async";
import type { RouteLocationRaw } from "vue-router";

export type GithubIntegrationAccess = {
  adminNeedsWorkspaceInstall: boolean;
  memberNeedsAccountLink: boolean;
  settingsRoute: RouteLocationRaw;
};

export type GithubWorkflowMutation = AsyncMutationState & {
  statusMessage: string | null;
  reconnectSuggested: boolean;
  installationMissingOnGithub: boolean;
};
