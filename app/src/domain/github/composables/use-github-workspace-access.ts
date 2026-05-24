import { useDependency } from "@/core/dependency-injection";
import { useAuth } from "@/domain/auth";
import { WorkspaceApi } from "@epicstory/api-client";
import type { WorkspaceMember } from "@epicstory/contracts";
import type { Ref } from "vue";
import { computed, ref, watch } from "vue";

/** Workspace owner (0) or admin (1) — can install the app and link repos to projects. */
export function isGithubWorkspaceManagerRole(role: number | undefined): boolean {
  return role === 0 || role === 1;
}

export function useGithubWorkspaceAccess(workspaceId: Ref<string>) {
  const { user } = useAuth();
  const workspaceApi = useDependency(WorkspaceApi);
  const members = ref<WorkspaceMember[]>([]);
  const membersLoading = ref(false);

  watch(
    workspaceId,
    async (wid) => {
      members.value = [];
      if (!wid) return;
      membersLoading.value = true;
      try {
        const page = await workspaceApi.findMembers(+wid, { page: 0, count: 1000 });
        members.value = page.content;
      } catch {
        members.value = [];
      } finally {
        membersLoading.value = false;
      }
    },
    { immediate: true },
  );

  const currentMember = computed(() => {
    const uid = user.value?.id;
    if (uid == null) return undefined;
    return members.value.find((m) => m.userId === uid);
  });

  const canManageGithubSetup = computed(() => isGithubWorkspaceManagerRole(currentMember.value?.role));

  return { members, membersLoading, currentMember, canManageGithubSetup };
}
