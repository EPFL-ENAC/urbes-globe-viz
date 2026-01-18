import { createApp } from "vue";
import { createPinia } from "pinia";
import { Quasar } from "quasar";
import "@quasar/extras/material-icons/material-icons.css";
import "quasar/dist/quasar.css";

import App from "./App.vue";
import router from "./router";

import "./style.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(Quasar, {
  config: {}
});

app.mount("#app");
