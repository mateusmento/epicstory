import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/HomeView.vue"),
    },
    {
      path: "/signup",
      name: "singup",
      component: () => import("@/views/signup/SignupView.vue"),
    },
    {
      path: "/signin",
      name: "signin",
      component: () => import("@/views/signin/SigninView.vue"),
    },
  ],
});

export default router;
