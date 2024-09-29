<script lang="ts" setup>
import { Button, Field, Form } from "@/design-system";
import UserPictureUpload from "./UserPictureUpload.vue";
import { useUser } from "@/domain/user";
import { useAuth } from "@/domain/auth";

const { user, updateUser } = useUser();

const { signOut } = useAuth();
</script>

<template>
  <div v-if="user" class="flex:rows-xl w-96 mx-auto px-4 mt-12">
    <UserPictureUpload />
    <Form @submit="updateUser($event)" :initial-values="user" class="flex:rows-lg">
      <Field name="name" label="Name" />
      <Button size="xs" class="ml-auto">Save</Button>
    </Form>
    <Button size="xs" class="ml-auto" @click="signOut">Sign out</Button>
  </div>
</template>
