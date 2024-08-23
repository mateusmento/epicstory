import "reflect-metadata";
import "@/design-system/styles/main.css";
import "@/design-system/styles/main.scss";

import "./icons";

import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import { createDependencies } from "./dependencies";
import { createDependenciesPlugin } from "@/core/dependency-injection";

async function main() {
  const app = createApp(App);

  const dependencies = await createDependencies();
  app.use(createDependenciesPlugin(dependencies));

  app.use(createPinia());
  app.use(router);

  app.mount("#app");
}

main();
