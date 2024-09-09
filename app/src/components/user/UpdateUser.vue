<script lang="ts" setup>
import { Button } from "@/design-system";
import { useAuth } from "@/domain/auth";
import { useUser } from "@/domain/user";
import { useDropZone } from "@vueuse/core";
import { ref } from "vue";

const { user, updateUserPicture } = useUser();
const { signOut } = useAuth();

const fileDrop = ref<HTMLElement>();
const pictureFile = ref<File>();
const pictureUrl = ref<string>(user.value?.picture ?? "");

function setPicture(file: File) {
  pictureFile.value = file;

  const reader = new FileReader();
  reader.addEventListener("load", (event) => {
    pictureUrl.value = (event.target?.result as string | null) ?? "";
  });
  reader.readAsDataURL(file);
}

const newPictureIsOver = ref(false);

useDropZone(fileDrop, {
  onEnter() {
    newPictureIsOver.value = true;
  },
  onLeave() {
    newPictureIsOver.value = false;
  },
  onDrop(files) {
    console.log(files);
    newPictureIsOver.value = false;
    setPicture((files ?? [])[0]);
  },
});

function onSave() {
  if (!pictureFile.value) return;
  const formData = new FormData();
  formData.set("picture", pictureFile.value);
  updateUserPicture(formData);
}
</script>

<template>
  <div class="flex:rows-lg">
    <label ref="fileDrop" class="self-center">
      <img v-if="!newPictureIsOver" :src="pictureUrl" class="rounded-full" />
      <div v-else class="dropzone w-96 h-96 flex items-center justify-center">Drop a new picture</div>
      <input type="file" hidden @change="setPicture((($event.target as any).files ?? [])[0])" />
    </label>
    <Button size="xs" @click="onSave">Save</Button>
    <Button @click="signOut">Sign out</Button>
  </div>
</template>

<style scoped>
.dropzone {
  border: dashed 4px #ccc; /*optional*/

  border-image-source: url("https://i.sstatic.net/LKclP.png");
  border-image-slice: 2;
  border-image-repeat: round;

  /* or use the shorthand border-image */
  border-image: url("https://i.sstatic.net/LKclP.png") 2 round;

  border-image-source: url("https://i.sstatic.net/LKclP.png");
  margin: 0 20px;
}
</style>
