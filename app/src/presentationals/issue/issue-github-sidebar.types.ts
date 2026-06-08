import type { AsyncDataView, AsyncMutationState } from "@/lib/async";
import type { GithubPullRequestGroup, GithubPrStatusFilter } from "@/lib/github";
import type { IGithubIssueBranchLink, IGithubIssuePullRequestLink } from "@epicstory/contracts";
import type { RouteLocationRaw } from "vue-router";

export type { GithubPrStatusFilter };

export type GithubPrGroupView = GithubPullRequestGroup;

export type GithubPrView = AsyncDataView<IGithubIssuePullRequestLink[]> & {
  groups: GithubPrGroupView[];
};

export type GithubLinkedBranchesView = AsyncDataView<IGithubIssueBranchLink[]>;

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
