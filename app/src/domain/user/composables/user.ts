import { useDependency } from "@/core/dependency-injection";
import { useAuth } from "@/domain/auth";
import { UserApi, WorkspaceApi } from "@epicstory/api-client";
import { WorkspaceRole } from "@epicstory/contracts";
import { useRouter } from "vue-router";

export function useUser() {
  const { user } = useAuth();
  const router = useRouter();

  const userApi = useDependency(UserApi);
  const workspaceApi = useDependency(WorkspaceApi);

  async function updateUserPicture(data: FormData) {
    user.value = await userApi.updatePicture(data);
  }

  async function updateUser(data: { name?: string }) {
    user.value = await userApi.update(data);
  }

  async function changePassword(data: { currentPassword: string; newPassword: string }) {
    await userApi.changePassword(data);
  }

  async function listOwnedWorkspaces() {
    if (!user.value) return [];
    const { content } = await workspaceApi.findWorkspaces();
    const owned: { id: number; name: string }[] = [];
    for (const workspace of content) {
      try {
        const members = await workspaceApi.findMembers(workspace.id, {
          count: 100,
        });
        const self = members.content.find((m) => m.userId === user.value?.id);
        if (self && self.role === WorkspaceRole.OWNER) {
          owned.push({ id: workspace.id, name: workspace.name });
        }
      } catch {
        // Skip workspaces we cannot inspect.
      }
    }
    return owned;
  }

  async function deleteAccount() {
    await userApi.deleteAccount();
    user.value = undefined;
    await router.push("/signin");
  }

  return {
    user,
    updateUser,
    updateUserPicture,
    changePassword,
    listOwnedWorkspaces,
    deleteAccount,
  };
}
