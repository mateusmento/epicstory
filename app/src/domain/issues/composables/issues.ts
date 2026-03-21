import { useDependency } from "@/core/dependency-injection";
import { defineStore, storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { IssueApi, type FindIssuesQuery, type UpdateIssueData } from "../api";
import type { Issue } from "../types";
import type { Page } from "@/core/types";

const useIssueStore = defineStore("issue", () => {
  const issues = ref<Issue[]>([]);
  return { issues };
});

export function useIssues() {
  const store = useIssueStore();

  const issueApi = useDependency(IssueApi);

  const page = ref<Page<Issue>>();
  const isFetchingIssues = ref(false);
  const hasMoreIssues = computed(() => !page.value || (page.value?.hasNext ?? false));

  async function fetchIssues(query: FindIssuesQuery) {
    isFetchingIssues.value = true;
    try {
      page.value = await issueApi.fetchIssues(query);
      store.issues = page.value.content;
    } finally {
      isFetchingIssues.value = false;
    }
    isFetchingIssues.value = false;
    return page.value;
  }

  async function fetchMoreIssues(query: Omit<FindIssuesQuery, "page" | "count">) {
    if ((page.value && !page.value.hasNext) || isFetchingIssues.value) return;
    isFetchingIssues.value = true;
    try {
      page.value = await issueApi.fetchIssues({
        ...query,
        page: (page.value?.page ?? -1) + 1,
        count: page.value?.count ?? 20,
      });
      store.issues.push(...page.value.content);
    } finally {
      isFetchingIssues.value = false;
    }
    isFetchingIssues.value = false;
    return page.value;
  }

  async function createIssue(projectId: number, title: string) {
    const issue = await issueApi.createIssue(projectId, { title });
    store.issues.push(issue);
    return issue;
  }

  async function updateIssue(issueId: number, data: UpdateIssueData) {
    const issue = await issueApi.updateIssue(issueId, data);
    const index = store.issues.findIndex((is) => is.id === issueId);
    if (index >= 0) store.issues[index] = issue;
    return issue;
  }

  async function removeIssue(issueId: number) {
    await issueApi.removeIssue(issueId);
    store.issues = store.issues.filter((i) => i.id !== issueId);
  }

  async function addAssignee(issueId: number, userId: number) {
    const issue = await issueApi.addAssignee(issueId, userId);
    const index = store.issues.findIndex((i) => i.id === issueId);
    if (index >= 0) store.issues[index] = issue;
    return issue;
  }

  async function removeAssignee(issueId: number, userId: number) {
    const issue = await issueApi.removeAssignee(issueId, userId);
    const index = store.issues.findIndex((i) => i.id === issueId);
    if (index >= 0) store.issues[index] = issue;
    return issue;
  }

  async function addLabel(issueId: number, labelId: number) {
    const issue = await issueApi.addLabel(issueId, labelId);
    const index = store.issues.findIndex((i) => i.id === issueId);
    if (index >= 0) store.issues[index] = issue;
    return issue;
  }

  async function removeLabel(issueId: number, labelId: number) {
    const issue = await issueApi.removeLabel(issueId, labelId);
    const index = store.issues.findIndex((i) => i.id === issueId);
    if (index >= 0) store.issues[index] = issue;
    return issue;
  }

  async function markAsSubIssueOf(subIssueId: number, parentIssueId: number) {
    const issue = await issueApi.updateIssue(subIssueId, { parentIssueId });
    const index = store.issues.findIndex((i) => i.id === parentIssueId);
    if (index >= 0) store.issues[index] = issue;
    return issue;
  }

  return {
    ...storeToRefs(store),
    isFetchingIssues,
    hasMoreIssues,
    fetchIssues,
    fetchMoreIssues,
    createIssue,
    updateIssue,
    removeIssue,
    addAssignee,
    removeAssignee,
    addLabel,
    removeLabel,
    markAsSubIssueOf,
  };
}
