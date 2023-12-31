import { axios } from '@/lib/axios';
import type { Issue, IssueComment } from '@/lib/models/issue.model';

export class IssueApi {
  fetchIssue(id: number) {
    return axios.get<Issue>('/issues/' + id).then((res) => res.data);
  }

  findIssues(productId: number, search: string) {
    return axios.get<Issue[]>('/issues', { params: { productId, search } }).then((res) => res.data);
  }

  patchIssue(id: number, partial: Partial<Issue>) {
    return axios.patch('/issues/' + id, partial).then((res) => res.data);
  }

  assignUser(id: number, assigneeId: number) {
    const url = `/issues/${id}/assigned-to`;
    return axios.put<Issue>(url, { assigneeId }).then((res) => res.data);
  }

  removeAssignee(id: number, assigneeId: number) {
    const url = `/issues/${id}/assignee/${assigneeId}`;
    return axios.delete<Issue>(url).then((res) => res.data);
  }

  findComments(id: number) {
    return axios.get<IssueComment[]>(`/issues/${id}/comments`).then((res) => res.data);
  }

  addComment(id: number, { text }: any) {
    return axios.post(`/issues/${id}/comments`, { text }).then((res) => res.data);
  }

  removeComment(id: number) {
    return axios.delete(`/issue-comments/${id}`);
  }

  updateComment(id: number, patch: any) {
    return axios.patch(`/issue-comments/${id}`, patch);
  }

  createSubTask(id: number, subtask: any) {
    return axios.post(`/issues/${id}/subtasks`, subtask).then((res) => res.data);
  }

  patchSubTask(subtaskId: number, subtask: any) {
    return axios.patch(`/subtasks/${subtaskId}`, subtask).then((res) => res.data);
  }

  removeSubtask(id: number) {
    return axios.delete(`/subtasks/${id}`);
  }

  toggleSubtaskCompletion(id: number) {
    return axios.put(`/subtasks/${id}/completion`);
  }
}
