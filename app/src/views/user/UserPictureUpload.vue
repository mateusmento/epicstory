<script lang="ts" setup>
import { Button } from "@/design-system";
import { useUser } from "@/domain/user";
import { useDropZone } from "@vueuse/core";
import { ref } from "vue";

const { user, updateUserPicture } = useUser();

const fileDrop = ref<HTMLElement>();
const pictureFile = ref<File>();
const pictureUrl = ref<string>(user.value?.picture ?? "");

function setPicture(file: File) {
  pictureFile.value = file;

  const reader = new FileReader();
  reader.addEventListener("load", (event) => {
    pictureUrl.value = (event.target?.result as string | null) ?? "";
  });
  reader.addEventListener("error", (err) => {
    console.log(err);
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
  <div class="flex:cols-lg">
    <label ref="fileDrop" class="self-center">
      <img v-if="!newPictureIsOver && pictureUrl" :src="pictureUrl" class="rounded-full" />
      <div
        v-else
        class="dropzone flex items-center justify-center w-40 h-40 text-sm text-center rounded-full border border-dashed"
      >
        Drop <br />
        new picture
      </div>
      <input type="file" hidden @change="setPicture((($event.target as any).files ?? [])[0])" />
    </label>
    <Button size="xs" @click="onSave">Save</Button>
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
