import "reflect-metadata";
/** Side-effect: merges `insertTable`, `toggleTaskList`, `setImage`, etc. into `@tiptap/core` command types for `vue-tsc`. */
import "@tiptap/extension-table";
import "@tiptap/extension-list";
import "@tiptap/extension-image";
import "highlight.js/styles/github-dark.css";
import "@/design-system/styles/main.css";
import "@/design-system/styles/main.scss";

import { createApp } from "vue";
import { createPinia } from "pinia";
import VueDndKitPlugin from "@vue-dnd-kit/core";

import App from "./App.vue";
import router from "./router";
import { createDependencies } from "./dependencies";
import { createDependenciesPlugin } from "@/core/dependency-injection";

import { addIcons } from "oh-vue-icons";
import * as icons from "./icons";
import { loadConfig } from "@/config";

async function main() {
  await loadConfig();

  const app = createApp(App);

  const dependencies = await createDependencies();
  app.use(createDependenciesPlugin(dependencies));

  app.use(createPinia());
  app.use(router);

  // Register Vue DnD Kit plugin - this initializes the drag engine and sensors
  // Without this, useDraggable() and useDroppable() hooks have no context to register with
  app.use(VueDndKitPlugin);

  addIcons(...Object.values(icons));

  app.mount("#app");
}

main();
