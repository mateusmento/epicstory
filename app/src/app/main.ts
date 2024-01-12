import 'reflect-metadata';
import '@/styles/main.scss';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { addIcons } from 'oh-vue-icons';

import App from './App.vue';
import router from './router';
import icons from './icons';

async function main() {
  if (import.meta.env.DEV) {
    await import('@/msw').then(({ setupMockApi }) => setupMockApi());
  }

  addIcons(...icons);

  const app = createApp(App);

  app.use(createPinia());
  app.use(router);

  app.mount('#app');
}

main();
