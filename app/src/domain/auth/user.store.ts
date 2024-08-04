import { defineStore } from "pinia";
import { ref } from "vue";
import type { User } from "./types/user.type";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User>();
  return { user };
});
