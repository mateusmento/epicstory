import { useDependency } from "@/core/dependency-injection";
import type { IUser as IUser } from "@epicstory/contracts";
import { AuthApi } from "@epicstory/api-client";
import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import { useRouter } from "vue-router";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<IUser>();
  const token = ref("");
  return { user, token };
});

export function useAuth() {
  const store = useAuthStore();

  const authApi = useDependency(AuthApi);

  const router = useRouter();

  async function authenticate() {
    const access = await authApi.authenticate();
    store.user = access.user;
    store.token = access.token;
  }

  async function signOut() {
    await authApi.signout();
    router.push("/signin");
  }

  return { ...storeToRefs(store), authenticate, signOut };
}
