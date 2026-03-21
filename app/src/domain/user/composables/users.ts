import { useDependency } from "@/core/dependency-injection";
import type { User } from "@/domain/auth";
import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import { UserApi } from "../api";
import { debounce } from "lodash";

export const useUsersStore = defineStore("users", () => {
  const users = ref<User[]>([]);
  const isFetchingUsers = ref(false);
  const isFetchingMoreUsers = ref(false);
  const hasMoreUsers = ref(true);
  const page = ref(0);
  const count = ref(20);
  const currentNameQuery = ref("");

  const userApi = useDependency(UserApi);

  async function searchUsersByName(name: string) {
    currentNameQuery.value = name;
    page.value = 0;
    hasMoreUsers.value = true;
    isFetchingUsers.value = true;
    try {
      const result = await userApi.findUsersByName(name, { page: page.value, count: count.value });
      users.value = result.content;
      hasMoreUsers.value = result.hasNext;
    } finally {
      isFetchingUsers.value = false;
    }
  }

  async function fetchMoreUsersByName() {
    if (isFetchingMoreUsers.value) return;
    if (!hasMoreUsers.value) return;

    isFetchingMoreUsers.value = true;
    try {
      const nextPage = page.value + 1;
      const result = await userApi.findUsersByName(currentNameQuery.value, {
        page: nextPage,
        count: count.value,
      });

      // Append and de-dupe by id (defensive against overlapping pages or concurrent changes).
      const existing = new Set(users.value.map((u) => u.id));
      for (const u of result.content) if (!existing.has(u.id)) users.value.push(u);

      page.value = nextPage;
      hasMoreUsers.value = result.hasNext;
    } finally {
      isFetchingMoreUsers.value = false;
    }
  }

  return {
    users,
    isFetchingUsers,
    isFetchingMoreUsers,
    hasMoreUsers,
    searchUsersByName: debounce(searchUsersByName, 200),
    fetchMoreUsersByName,
  };
});

export function useUsers() {
  const store = useUsersStore();

  const userApi = useDependency(UserApi);

  async function fetchUsers(username: string) {
    const result = await userApi.findUsers(username, { page: 0, count: 20 });
    store.users = result.content;
  }

  return {
    ...storeToRefs(store),
    fetchUsers,
    fetchUsersByName: store.searchUsersByName,
    fetchMoreUsersByName: store.fetchMoreUsersByName,
  };
}
