import { useDependency } from "@/core/dependency-injection";
import { IssueApi, type UpdateIssueData } from "@/domain/issues";
import { defineStore, storeToRefs } from "pinia";
import { reactive, ref } from "vue";
import { BacklogItemApi, type FindBacklogItemsQuery } from "../api";
import type { BacklogItem } from "../types";

const useBacklogStore = defineStore("backlog", () => {
  const backlogItems = ref<BacklogItem[]>([]);
  return { backlogItems };
});

export function useBacklog() {
  const store = useBacklogStore();

  const backlogItemApi = useDependency(BacklogItemApi);
  const issueApi = useDependency(IssueApi);

  async function fetchBacklogItems(query: FindBacklogItemsQuery) {
    const { content } = await backlogItemApi.findAll(query);
    store.backlogItems = content.map((x) => reactive(x));
  }

  async function createBacklogItem(backlogId: number, data: any) {
    const item = await backlogItemApi.create(backlogId, data);
    const index = store.backlogItems.findIndex((i) => i.order > item.order);
    if (index >= 0) store.backlogItems.splice(index, 0, reactive(item));
    else store.backlogItems.push(reactive(item));
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
    const index = store.backlogItems.findIndex((item) => item.issue.id === issueId);
    if (index >= 0) store.backlogItems[index].issue = issue;
    return issue;
  }

  async function addAssignee(issueId: number, userId: number) {
    const issue = await issueApi.addAssignee(issueId, userId);
    const index = store.backlogItems.findIndex((i) => i.issue.id === issueId);
    if (index >= 0) store.backlogItems[index].issue = issue;
    return issue;
  }

  return {
    ...storeToRefs(store),
    fetchBacklogItems,
    createBacklogItem,
    moveBacklogItem,
    removeBacklogItem,
    updateIssue,
    addAssignee,
  };
}
