import { useDependency } from "@/core/dependency-injection";
import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import { IssueApi } from "../api";
import type { Issue } from "../types";

const useIssueStore = defineStore("issue", () => {
  const issues = ref<Issue[]>([]);
  return { issues };
});

export function useIssues() {
  const store = useIssueStore();

  const issueApi = useDependency(IssueApi);

  async function fetchIssues(projectId: number, page: number, count: number) {
    const { content } = await issueApi.fetchIssues(projectId, page, count);
    store.issues = content;
  }

  async function createIssue(projectId: number, title: string) {
    const issue = await issueApi.createIssue(projectId, title);
    store.issues.push(issue);
    return issue;
  }

  return {
    ...storeToRefs(store),
    fetchIssues,
    createIssue,
  };
}
