import { UnauthorizedException } from "@/core/axios";
import { useAuth } from "@/domain/auth";
import { useWorkspace } from "@/domain/workspace";
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
    {
      path: "/error",
      name: "error",
      component: () => import("@/views/error/ErrorView.vue"),
    },
  ],
});

const authenticatedRoutes = defineRoutes({
  routes: [
    {
      path: "/",
      component: () => import("@/views/Dashboard.vue"),
      children: [
        {
          path: "/settings/user-account",
          component: () => import("@/views/user/UserAccountSettings.vue"),
        },
        {
          path: "/channel/:channelId",
          component: () => import("@/views/channel/Channel.vue"),
        },
        {
          path: "/channel/:channelId/meeting",
          component: () => import("@/views/channel/Meeting.vue"),
        },
        {
          path: "/project/:projectId",
          component: () => import("@/views/project/Project.vue"),
          props: true,
          children: [
            {
              path: "backlog",
              props: true,
              component: () => import("@/views/project/backlog/Backlog.vue"),
            },
            {
              path: "board",
              props: true,
              component: () => import("@/views/project/board/Board.vue"),
            },
            {
              path: "issue/:issueId",
              props: true,
              component: () => import("@/views/issue/IssueView.vue"),
            },
          ],
        },
      ],
    },
    {
      path: "/workspace-member-invite/:inviteId",
      component: () => import("@/views/workspace/MemberInvite.vue"),
      props: true,
    },
  ],
  beforeEnter: async (to, from, next) => {
    const { authenticate } = useAuth();
    const { workspace } = useWorkspace();
    try {
      await authenticate();
      next();
    } catch (ex) {
      if (ex instanceof UnauthorizedException) {
        // Store the intended destination in query params for redirect after login
        workspace.value = null;
        next({
          name: "signin",
          query: { redirect: to.fullPath },
        });
      } else {
        next({ name: "error" });
      }
    }
  },
});

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [openRoutes, authenticatedRoutes].flat(),
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
