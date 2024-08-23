import "reflect-metadata";
import "@/design-system/styles/main.css";
import "@/design-system/styles/main.scss";

import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import { createDependencies } from "./dependencies";
import { createDependenciesPlugin } from "@/core/dependency-injection";

import { addIcons } from "oh-vue-icons";
import * as icons from "./icons";

async function main() {
  const app = createApp(App);

  const dependencies = await createDependencies();
  app.use(createDependenciesPlugin(dependencies));

  app.use(createPinia());
  app.use(router);

  addIcons(...Object.values(icons));

  app.mount("#app");
}

main();
