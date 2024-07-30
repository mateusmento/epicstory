import { useDependency } from "@/core/dependency-injection";
import { defineStore, storeToRefs } from "pinia";
import { UserApi } from "../api";
import type { User } from "../types";
import { ref } from "vue";

export const useUserStore = defineStore("user", () => {
  const user = ref<User>();
  return { user };
});

export function useUser() {
  const store = useUserStore();

  const userApi = useDependency(UserApi);

  async function updateUserPicture(data: { picture: string }) {
    store.user = await userApi.updatePicture(data);
  }

  return {
    ...storeToRefs(store),
    updateUserPicture,
  };
}
