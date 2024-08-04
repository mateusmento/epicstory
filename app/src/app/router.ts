import { useDependency } from "@/core/dependency-injection";
import { useAuth } from "@/domain/auth";
import { AuthService } from "@/domain/auth/auth.service";
import { isAxiosError } from "axios";
import {
  createRouter,
  createWebHistory,
  type NavigationGuardWithThis,
  type RouteRecordRaw,
} from "vue-router";

type RouteOptions = Pick<RouteRecordRaw, "beforeEnter" | "meta" | "props">;

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
  routes: [
    {
      path: "/",
      component: () => import("@/views/dashboard/Dashboard.vue"),
    },
    {
      path: "/derbel",
      component: () => import("@/views/derbel/Derbel.vue"),
    },
  ],
  beforeEnter: async (to, from, next) => {
    const authService = useDependency(AuthService);
    const { user, token } = useAuth();

    try {
      const access = await authService.authenticate();
      user.value = access.user;
      token.value = access.token;
      next();
    } catch (ex) {
      if (isAxiosError(ex) && ex.response?.status === 401) {
        next({ name: "signin" });
      } else {
        next();
      }
    }
  },
});

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...openRoutes, ...authenticatedRoutes],
});

export default router;

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
