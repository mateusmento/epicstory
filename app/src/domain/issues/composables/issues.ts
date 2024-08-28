import { useDependency } from "@/core/dependency-injection";
import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import { IssueApi, type FindIssuesQuery, type UpdateIssueData } from "../api";
import type { Issue } from "../types";

const useIssueStore = defineStore("issue", () => {
  const issues = ref<Issue[]>([]);
  return { issues };
});

export function useIssues() {
  const store = useIssueStore();

  const issueApi = useDependency(IssueApi);

  async function fetchIssues(query: FindIssuesQuery) {
    const { content } = await issueApi.fetchIssues(query);
    store.issues = content;
  }

  async function createIssue(projectId: number, title: string) {
    const issue = await issueApi.createIssue(projectId, title);
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

  return {
    ...storeToRefs(store),
    fetchIssues,
    createIssue,
    updateIssue,
    removeIssue,
    addAssignee,
  };
}
