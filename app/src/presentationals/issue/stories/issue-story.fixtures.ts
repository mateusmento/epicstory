import type { AsyncDataView, PaginatedListView } from "@/lib/async";
import { groupGithubPullRequests, type GithubPullRequestGroup } from "@/lib/github";
import type { GithubIntegrationAccess, GithubWorkflowMutation } from "@/lib/github";
import type { IssueAttachmentTileRow } from "@/lib/issues";
import { storyLabels, storyUsers } from "@/presentationals/stories/fixtures";
import type {
  IGithubCatalogRepository,
  IGithubIssueBranchLink,
  IGithubIssuePullRequestLink,
  IIssue,
} from "@epicstory/contracts";

export const storyIssue: IIssue = {
  id: 42,
  issueKey: "EP-42",
  issueNumber: 42,
  title: "Storybook wiring for issue GitHub workflow",
  description: {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Keep story contracts in sync." }] }],
  },
  workspaceId: 1,
  projectId: 1,
  createdById: storyUsers.sean.id,
  createdAt: "2026-06-10T20:00:00.000Z",
  status: "doing",
  dueDate: new Date("2026-06-20T00:00:00.000Z"),
  assignees: [storyUsers.sean],
  priority: 2,
  labels: [storyLabels[0]!, storyLabels[1]!],
  commentChannelId: 77,
};

const persistedRows: IssueAttachmentTileRow[] = [
  {
    key: "persisted-1",
    kind: "persisted",
    item: {
      id: 1,
      issueId: storyIssue.id,
      messageId: null,
      messageReplyId: null,
      url: "https://cdn.example.com/spec.pdf",
      mimeType: "application/pdf",
      originalFilename: "issue-spec.pdf",
      byteSize: 400_000,
      uploadedById: storyUsers.sean.id,
    },
  },
  {
    key: "persisted-2",
    kind: "persisted",
    item: {
      id: 2,
      issueId: storyIssue.id,
      messageId: null,
      messageReplyId: null,
      url: "https://cdn.example.com/mock.png",
      mimeType: "image/png",
      originalFilename: "mock.png",
      byteSize: 120_000,
      uploadedById: storyUsers.daiana.id,
    },
  },
];

export const storyIssueAttachmentRows: IssueAttachmentTileRow[] = [
  ...persistedRows,
  {
    key: "uploading-1",
    kind: "uploading",
    clientId: "uploading-1",
    file: new File(["temp"], "review-notes.txt", { type: "text/plain" }),
    previewUrl: "",
  },
  {
    key: "failed-1",
    kind: "failed",
    clientId: "failed-1",
    file: new File(["oops"], "large-video.mp4", { type: "video/mp4" }),
    previewUrl: "",
    message: "File exceeds upload limit",
  },
];

export const storyIssueAttachmentsView: AsyncDataView<IssueAttachmentTileRow[]> = {
  data: storyIssueAttachmentRows,
  loading: false,
  error: null,
};

export const storyGithubRepos: IGithubCatalogRepository[] = [
  {
    githubRepoId: "repo-1",
    name: "epicstory",
    fullName: "epicstory/epicstory",
    owner: "epicstory",
    defaultBranch: "main",
    private: true,
    htmlUrl: "https://github.com/epicstory/epicstory",
  },
  {
    githubRepoId: "repo-2",
    name: "epicstory-docs",
    fullName: "epicstory/epicstory-docs",
    owner: "epicstory",
    defaultBranch: "main",
    private: false,
    htmlUrl: "https://github.com/epicstory/epicstory-docs",
  },
];

export const storyGithubRepoList: PaginatedListView<IGithubCatalogRepository> = {
  items: storyGithubRepos,
  loading: false,
  loadingMore: false,
  hasMore: true,
  error: null,
};

export const storyLinkedBranches: IGithubIssueBranchLink[] = [
  {
    id: 1,
    owner: "epicstory",
    repoName: "epicstory",
    branchName: "EP-42-storybook-wiring",
    fullName: "epicstory/epicstory",
    htmlUrl: "https://github.com/epicstory/epicstory/tree/EP-42-storybook-wiring",
    source: "epicstory_create",
    firstLinkedAt: "2026-06-10T20:00:00.000Z",
    lastPushedAt: "2026-06-10T20:20:00.000Z",
  },
  {
    id: 2,
    owner: "epicstory",
    repoName: "epicstory-docs",
    branchName: "EP-42-docs-notifications",
    fullName: "epicstory/epicstory-docs",
    htmlUrl: "https://github.com/epicstory/epicstory-docs/tree/EP-42-docs-notifications",
    source: "webhook_push",
    firstLinkedAt: "2026-06-10T20:00:00.000Z",
    lastPushedAt: "2026-06-10T20:40:00.000Z",
  },
];

export const storyLinkedBranchesView: AsyncDataView<IGithubIssueBranchLink[]> = {
  data: storyLinkedBranches,
  loading: false,
  error: null,
};

export const storyIssuePullRequests: IGithubIssuePullRequestLink[] = [
  {
    id: 11,
    issueId: storyIssue.id,
    githubPullRequestId: "pr-11",
    owner: "epicstory",
    repoName: "epicstory",
    fullName: "epicstory/epicstory",
    prNumber: 218,
    htmlUrl: "https://github.com/epicstory/epicstory/pull/218",
    headRef: "EP-42-storybook-wiring",
    baseRef: "main",
    state: "open",
    draft: false,
    merged: false,
    mergedAt: null,
    closedAt: null,
    githubUpdatedAt: "2026-06-10T21:00:00.000Z",
    createdAt: "2026-06-10T20:30:00.000Z",
    updatedAt: "2026-06-10T21:00:00.000Z",
  },
  {
    id: 12,
    issueId: storyIssue.id,
    githubPullRequestId: "pr-12",
    owner: "epicstory",
    repoName: "epicstory-docs",
    fullName: "epicstory/epicstory-docs",
    prNumber: 44,
    htmlUrl: "https://github.com/epicstory/epicstory-docs/pull/44",
    headRef: "EP-42-docs-notifications",
    baseRef: "main",
    state: "closed",
    draft: false,
    merged: true,
    mergedAt: "2026-06-10T19:40:00.000Z",
    closedAt: "2026-06-10T19:40:00.000Z",
    githubUpdatedAt: "2026-06-10T19:40:00.000Z",
    createdAt: "2026-06-10T18:30:00.000Z",
    updatedAt: "2026-06-10T19:40:00.000Z",
  },
];

export const storyIssuePullRequestGroups: GithubPullRequestGroup[] = groupGithubPullRequests(
  storyIssuePullRequests,
  "all",
);

export const storyIssuePrView: AsyncDataView<IGithubIssuePullRequestLink[]> & {
  groups: GithubPullRequestGroup[];
} = {
  data: storyIssuePullRequests,
  loading: false,
  error: null,
  groups: storyIssuePullRequestGroups,
};

export const storyGithubAccess: GithubIntegrationAccess = {
  adminNeedsWorkspaceInstall: false,
  memberNeedsAccountLink: false,
  settingsRoute: "/workspace/settings/integrations",
};

export const storyGithubAccessNeedsInstall: GithubIntegrationAccess = {
  adminNeedsWorkspaceInstall: true,
  memberNeedsAccountLink: false,
  settingsRoute: "/workspace/settings/integrations",
};

export const storyGithubAccessNeedsMemberLink: GithubIntegrationAccess = {
  adminNeedsWorkspaceInstall: false,
  memberNeedsAccountLink: true,
  settingsRoute: "/workspace/settings/integrations",
};

export const storyGithubWorkflowMutation: GithubWorkflowMutation = {
  busy: false,
  error: null,
  statusMessage: null,
  reconnectSuggested: false,
  installationMissingOnGithub: false,
};
