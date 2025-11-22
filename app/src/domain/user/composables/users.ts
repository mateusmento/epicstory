import { useDependency } from "@/core/dependency-injection";
import type { User } from "@/domain/auth";
import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import { UserApi } from "../api";

export const useUsersStore = defineStore("users", () => {
  const users = ref<User[]>([]);
  return { users };
});

export function useUsers() {
  const store = useUsersStore();

  const userApi = useDependency(UserApi);

  async function fetchUsers(username: string) {
    store.users = await userApi.findUsers(username);
  }

  async function fetchUsersByName(name: string) {
    store.users = await userApi.findUsersByName(name);
  }

  return {
    ...storeToRefs(store),
    fetchUsers,
    fetchUsersByName,
  };
}
