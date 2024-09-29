import { useDependency } from "@/core/dependency-injection";
import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import { IssueApi, type UpdateIssueData } from "../api";
import type { Issue } from "../types";

export const useIssueStore = defineStore("issue", () => {
  const issue = ref<Issue>();
  return { issue };
});

export function useIssue() {
  const store = useIssueStore();
  const issueApi = useDependency(IssueApi);

  async function fetchIssue(issueId: number) {
    store.issue = await issueApi.fetchIssue(issueId);
  }

  async function updateIssue(data: UpdateIssueData) {
    if (!store.issue) return;
    store.issue = await issueApi.updateIssue(store.issue.id, data);
  }

  return {
    ...storeToRefs(store),
    fetchIssue,
    updateIssue,
  };
}
