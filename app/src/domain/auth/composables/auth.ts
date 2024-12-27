import { useDependency } from "@/core/dependency-injection";
import { AuthService } from "../auth.service";
import { useRouter } from "vue-router";
import { useWorkspace } from "@/domain/workspace";
import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import type { User } from "@/domain/user";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User>();
  const token = ref("");
  return { user, token };
});

export function useAuth() {
  const store = useAuthStore();

  const authApi = useDependency(AuthService);
  const { workspace } = useWorkspace();

  const router = useRouter();

  async function authenticate() {
    const access = await authApi.authenticate();
    store.user = access.user;
    store.token = access.token;
  }

  async function signOut() {
    await authApi.signout();
    router.push("/signin");
    workspace.value = null;
  }

  return { ...storeToRefs(store), authenticate, signOut };
}
