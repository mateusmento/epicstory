import type { AsyncMutationState } from "@/lib/async";
import type { IGithubIssueBranchLink, IGithubIssuePullRequestLink } from "@epicstory/contracts";
import type { RouteLocationRaw } from "vue-router";

export type GithubPrStatusFilter = "all" | "open" | "merged" | "closed";

export type GithubPrGroupView = {
  fullName: string;
  pullRequests: IGithubIssuePullRequestLink[];
};

export type GithubPrView = {
  loading: boolean;
  error: string | null;
  count: number;
  groups: GithubPrGroupView[];
};

export type GithubLinkedBranchesView = {
  items: IGithubIssueBranchLink[];
  loading: boolean;
  error: string | null;
};

export type GithubWorkflowMutationView = AsyncMutationState & {
  statusMessage: string | null;
  reconnectSuggested: boolean;
  installationMissingOnGithub: boolean;
  createBranchDialogError: string | null;
};

export type GithubAccessBannerView = {
  adminNeedsWorkspaceInstall: boolean;
  memberNeedsAccountLink: boolean;
  settingsRoute: RouteLocationRaw;
};

export type GithubBranchWorkflowView = {
  formVisible: boolean;
  linkedBranches: GithubLinkedBranchesView;
  mutation: GithubWorkflowMutationView;
  selectedLinkedBranch: IGithubIssueBranchLink | null;
  selectedGhRepoId: string | null;
  headBranchLeaf: string;
};
