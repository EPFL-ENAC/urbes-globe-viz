import { createRouter, createWebHistory } from "vue-router";
import GlobeView from "@/pages/GlobeView.vue";
import ProjectDetailView from "@/pages/ProjectDetailView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "globe",
      component: GlobeView,
    },
    {
      path: "/project/:id",
      name: "project-detail",
      component: ProjectDetailView,
    },
  ],
});

export default router;
