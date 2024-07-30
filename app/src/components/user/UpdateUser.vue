<script lang="ts" setup>
import { Button, Field, Form } from "@/design-system";
import { useUser } from "@/domain/user";

const { user, updateUserPicture } = useUser();
</script>

<template>
  <div>
    <Form :initial-values="user" @submit="updateUserPicture($event as any)" class="flex:rows-lg">
      <Field label="Picture" name="picture" placeholder="Enter an image url..." />
      <Button type="submit" size="xs">Save</Button>
    </Form>
  </div>
</template>
