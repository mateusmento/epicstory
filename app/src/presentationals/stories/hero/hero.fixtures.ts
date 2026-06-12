import { toPaginatedListView } from "@/lib/async";
import type { IBacklogItem, IIssue, ILabel, IUser, WorkspaceMember } from "@epicstory/contracts";
import { storyIssue } from "@/presentationals/issue/stories/issue-story.fixtures";
import { storyLabels, storyMembers, storyStackUsers, storyUsers } from "@/presentationals/stories/fixtures";

export const heroLongTitle =
  "Align Storybook hero slices with production wiring so redesign can ship from presentational components without container churn";

export const heroWorkspaceMembers: WorkspaceMember[] = [
  { id: 1, workspaceId: 1, role: "admin", user: storyUsers.sean },
  { id: 2, workspaceId: 1, role: "member", user: storyUsers.daiana },
  { id: 3, workspaceId: 1, role: "member", user: storyUsers.jean },
];

export const heroWorkspaceMemberList = toPaginatedListView({
  items: heroWorkspaceMembers,
  loading: false,
  loadingMore: false,
  hasMore: false,
});

export type HeroIssueHeaderState = {
  projectName: string;
  issueKey: string;
  title: string;
  status: string;
  priority: number;
  dueDate: Date | null;
  labelIds: number[];
  assignees: IUser[];
  catalog: ILabel[];
};

export function makeHeroIssueHeaderState(
  overrides: Partial<HeroIssueHeaderState> = {},
): HeroIssueHeaderState {
  return {
    projectName: "Epicstory",
    issueKey: storyIssue.issueKey,
    title: storyIssue.title,
    status: storyIssue.status,
    priority: storyIssue.priority ?? 0,
    dueDate: storyIssue.dueDate ?? null,
    labelIds: storyIssue.labels?.map((l) => l.id) ?? [],
    assignees: [...(storyIssue.assignees ?? [])],
    catalog: storyLabels,
    ...overrides,
  };
}

export const heroIssueHeaderDefault = makeHeroIssueHeaderState();

export const heroIssueHeaderDense = makeHeroIssueHeaderState({
  title: heroLongTitle,
  labelIds: storyLabels.map((l) => l.id),
  assignees: storyStackUsers,
  priority: 4,
});

export const heroIssueHeaderEmpty = makeHeroIssueHeaderState({
  labelIds: [],
  assignees: [],
  priority: 0,
  dueDate: null,
  status: "todo",
});

function backlogItem(
  issue: Partial<IIssue> & Pick<IIssue, "id" | "issueKey" | "title">,
  order: number,
): IBacklogItem {
  return {
    id: issue.id,
    order,
    previousId: order > 1 ? order - 1 : null,
    nextId: null,
    issue: {
      id: issue.id,
      issueNumber: issue.id,
      issueKey: issue.issueKey,
      title: issue.title,
      description: { type: "doc", content: [] },
      workspaceId: 1,
      projectId: 1,
      createdById: storyUsers.sean.id,
      createdAt: "2026-06-10T20:00:00.000Z",
      status: issue.status ?? "todo",
      priority: issue.priority ?? 0,
      dueDate: issue.dueDate ?? null,
      assignees: issue.assignees ?? [],
      labels: issue.labels ?? [],
      commentChannelId: null,
      ...issue,
    } as IIssue,
  };
}

export const heroPlanningCardDefault = backlogItem(
  {
    id: 301,
    issueKey: "EP-301",
    title: "Support milestone in issue details",
    status: "doing",
    priority: 3,
    dueDate: new Date("2026-06-20T00:00:00.000Z"),
    assignees: storyMembers,
    labels: storyLabels.slice(0, 2),
  },
  1,
);

export const heroPlanningCardDense = backlogItem(
  {
    id: 302,
    issueKey: "EP-302",
    title: heroLongTitle,
    status: "doing",
    priority: 4,
    dueDate: new Date("2026-06-18T00:00:00.000Z"),
    assignees: storyStackUsers,
    labels: storyLabels,
  },
  2,
);

export const heroPlanningCardOverdue = backlogItem(
  {
    id: 303,
    issueKey: "EP-303",
    title: "Fix notification payload fallbacks",
    status: "todo",
    priority: 2,
    dueDate: new Date("2026-05-01T00:00:00.000Z"),
    assignees: [storyUsers.sean],
    labels: [storyLabels[0]!],
  },
  3,
);

export const heroPlanningCardDone = backlogItem(
  {
    id: 304,
    issueKey: "EP-304",
    title: "Surface issue keys on board cards",
    status: "done",
    priority: 1,
    dueDate: null,
    assignees: [storyUsers.daiana],
    labels: [storyLabels[1]!],
  },
  4,
);
