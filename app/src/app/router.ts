import { useDependency } from "@/core/dependency-injection";
import { AuthService } from "@/domain/auth/auth.service";
import { useAuthStore } from "@/domain/auth/user.store";
import { useUserStore } from "@/domain/user";
import { isAxiosError } from "axios";
import {
  createRouter,
  createWebHistory,
  type NavigationGuardWithThis,
  type RouteRecordRaw,
} from "vue-router";

type RouteOptions = Pick<RouteRecordRaw, "beforeEnter" | "meta" | "props">;

export function defineRoutes({
  routes,
  ...options
}: RouteOptions & { routes: RouteRecordRaw[] }): RouteRecordRaw[] {
  return routes.map(function merge(route) {
    const merged: RouteRecordRaw = {
      ...route,
      beforeEnter: [options.beforeEnter, route.beforeEnter]
        .flat()
        .filter((bf): bf is NavigationGuardWithThis<any> => bf !== undefined),
    };
    merged.meta = { ...route.meta, ...options.meta };
    merged.props = route.props ?? options.props;
    merged.children = route.children && route.children.map((child) => merge(child));
    return merged;
  });
}

const openRoutes = defineRoutes({
  routes: [
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

const authenticatedRoutes = defineRoutes({
  beforeEnter: async (to, from, next) => {
    const authService = useDependency(AuthService);
    const authStore = useAuthStore();
    const userStore = useUserStore();

    try {
      const { user } = await authService.authenticate();
      authStore.user = user;
      userStore.user = user;
      next();
    } catch (ex) {
      if (isAxiosError(ex) && ex.response?.status === 401) {
        next({ name: "signin" });
      } else {
        next();
      }
    }
  },
  routes: [
    {
      path: "/",
      component: () => import("@/views/dashboard/Dashboard.vue"),
    },
  ],
});

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...openRoutes, ...authenticatedRoutes],
});

export default router;
