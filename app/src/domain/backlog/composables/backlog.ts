import { useDependency } from "@/core/dependency-injection";
import type { FindBacklogItemsQuery, IBacklogItem, IIssue, UpdateIssueData } from "@epicstory/contracts";
import { BacklogApi, IssueApi } from "@epicstory/api-client";
import { defineStore, storeToRefs } from "pinia";
import { reactive, ref } from "vue";

const useBacklogStore = defineStore("backlog", () => {
  const backlogItems = ref<IBacklogItem[]>([]);

  async function updateIssue(issue: IIssue) {
    const index = backlogItems.value.findIndex((b) => b.issue.id === issue.id);
    if (index >= 0) backlogItems.value[index].issue = issue;
    return issue;
  }

  return { backlogItems, updateIssue };
});

export function useBacklog() {
  const store = useBacklogStore();

  const backlogItemApi = useDependency(BacklogApi);
  const issueApi = useDependency(IssueApi);

  async function fetchBacklogItems(query: FindBacklogItemsQuery) {
    const { content } = await backlogItemApi.findAll(query);
    store.backlogItems = content;
  }

  async function createBacklogItem(projectId: number, data: any) {
    const item = await backlogItemApi.create(projectId, data);
    const index = store.backlogItems.findIndex((i) => i.order > item.order);
    if (index >= 0) store.backlogItems.splice(index, 0, reactive(item));
    else store.backlogItems.push(reactive(item));
    return item as IBacklogItem;
  }

  async function moveBacklogItem(itemId: number, data: any) {
    return backlogItemApi.move(itemId, data);
  }

  async function removeBacklogItem(itemId: number) {
    await backlogItemApi.remove(itemId);
    store.backlogItems = store.backlogItems.filter((item) => item.id !== itemId);
  }

  async function updateIssue(issueId: number, data: UpdateIssueData) {
    const issue = await issueApi.updateIssue(issueId, data);
    return store.updateIssue(issue);
  }

  async function addAssignee(issueId: number, userId: number) {
    const issue = await issueApi.addAssignee(issueId, userId);
    return store.updateIssue(issue);
  }

  async function removeAssignee(issueId: number, userId: number) {
    const issue = await issueApi.removeAssignee(issueId, userId);
    return store.updateIssue(issue);
  }

  async function addLabel(issueId: number, labelId: number) {
    const issue = await issueApi.addLabel(issueId, labelId);
    return store.updateIssue(issue);
  }

  async function removeLabel(issueId: number, labelId: number) {
    const issue = await issueApi.removeLabel(issueId, labelId);
    return store.updateIssue(issue);
  }

  async function markAsSubIssueOf(subIssueId: number, parentIssueId: number | null) {
    const issue = await issueApi.updateIssue(subIssueId, { parentIssueId });
    return store.updateIssue(issue);
  }

  async function removeIssue(issueId: number, options?: { deleteSubIssues?: boolean }) {
    await issueApi.removeIssue(issueId, options);
    store.backlogItems = store.backlogItems.filter((item) => item.issue.id !== issueId);
  }

  return {
    ...storeToRefs(store),
    fetchBacklogItems,
    createBacklogItem,
    moveBacklogItem,
    removeBacklogItem,
    updateIssue,
    addAssignee,
    removeAssignee,
    addLabel,
    removeLabel,
    markAsSubIssueOf,
    removeIssue,
  };
}
