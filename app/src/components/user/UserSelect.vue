<script setup lang="ts">
import UserAvatar from "./UserAvatar.vue";
import { Combobox } from "@/design-system";
import { useAuth } from "@/domain/auth";
import { useUsers, type User } from "@/domain/user";
import { computed, onMounted, ref, watch } from "vue";

const props = defineProps<{
  exclude?: string;
}>();

const user = defineModel<User>();

const { user: authUser } = useAuth();
const { users, fetchUsersByName } = useUsers();
const query = ref("");

onMounted(() => fetchUsersByName(""));
watch(query, () => fetchUsersByName(query.value));

const filteredUsers = computed(() => {
  return users.value.filter((user) => !props.exclude || user.id !== authUser.value?.id);
});
</script>

<template>
  <Combobox
    v-model="user"
    v-model:searchTerm="query"
    :options="filteredUsers"
    track-by="id"
    label-by="name"
    name="user"
  >
    <template v-if="$slots.trigger" #trigger>
      <slot name="trigger" />
    </template>

    <template #option="{ option }">
      <div class="flex:row-auto flex:center-y">
        <UserAvatar :name="option.name" :picture="option.picture" size="xs" class="mr-2 flex-shrink-0" />
        <div class="text-sm font-medium">{{ option.name }}</div>
      </div>
    </template>
  </Combobox>
</template>
