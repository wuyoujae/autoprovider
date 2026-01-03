import { createRouter, createWebHistory } from "vue-router";
import WelcomeView from "@/views/welcome/welcome.vue";
import LoginView from "@/views/login/login.vue";
import DashboardView from "@/views/dashboard/dashboard.vue";
import ProjectView from "@/views/dashboard/dashboard-project/project.vue";
import CreditsView from "@/views/dashboard/dashboard-credits/dashboard-credits.vue";
import PreferencesView from "@/views/dashboard/dashboard-preferences/dashboard-preferences.vue";
import WorkView from "@/views/work/work.vue";
import ErrorView from "@/views/error/error.vue";
import ChangelogView from "@/views/changelog/changelog.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "welcome",
      component: WelcomeView,
    },
    {
      path: "/login",
      name: "login",
      component: LoginView,
    },
    {
      path: "/dashboard",
      component: DashboardView,
      children: [
        {
          path: "",
          redirect: "/dashboard/projects",
        },
        {
          path: "projects",
          name: "dashboard-projects",
          component: ProjectView,
        },
        {
          path: "credits",
          name: "dashboard-credits",
          component: CreditsView,
        },
        {
          path: "preferences",
          name: "dashboard-preferences",
          component: PreferencesView,
        },
      ],
    },
    {
      path: "/work",
      name: "work",
      component: WorkView,
      props: (route) => ({
        projectId: route.query.projectId,
      }),
    },
    {
      path: "/changelog",
      name: "changelog",
      component: ChangelogView,
    },
    {
      path: "/changelog/:id",
      name: "changelog-detail",
      component: () => import("@/views/changelog/changelog-detail.vue"),
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: ErrorView,
    },
  ],
});

export default router;
