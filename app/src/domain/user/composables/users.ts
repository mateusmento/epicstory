import { useDependency } from "@/core/dependency-injection";
import type { User } from "@/domain/auth";
import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import { UserApi } from "../api";
import { debounce } from "lodash";

export const useUsersStore = defineStore("users", () => {
  const users = ref<User[]>([]);

  const userApi = useDependency(UserApi);

  async function fetchUsersByName(name: string) {
    users.value = await userApi.findUsersByName(name);
  }

  return { users, fetchUsersByName: debounce(fetchUsersByName, 200) };
});

export function useUsers() {
  const store = useUsersStore();

  const userApi = useDependency(UserApi);

  async function fetchUsers(username: string) {
    store.users = await userApi.findUsers(username);
  }

  return {
    ...storeToRefs(store),
    fetchUsers,
    fetchUsersByName: store.fetchUsersByName,
  };
}
