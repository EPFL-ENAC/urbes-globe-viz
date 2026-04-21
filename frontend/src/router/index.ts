import { createRouter, createWebHistory } from "vue-router";
import GlobeView from "@/pages/GlobeView.vue";
import ProjectDetailView from "@/pages/ProjectDetailView.vue";

export const DEFAULT_TITLE =
  "URBES - Laboratory of Urban and Environmental Systems";

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

// Reset to default on every navigation; ProjectDetailView overrides it
// once the project data is resolved.
router.afterEach(() => {
  document.title = DEFAULT_TITLE;
});

export default router;
