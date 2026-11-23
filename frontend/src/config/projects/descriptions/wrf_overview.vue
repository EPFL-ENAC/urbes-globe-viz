<!--
  Overview of the WRF project (section 01): the project text, then the map of
  the domains. The map works as a menu, a click opens the domain section.
  The text comes from wrfProject.description, so it is written only once.
-->
<script setup lang="ts">
import { renderDescription } from "@/utils/markdown";
import { wrfProject } from "../wrf";
import WrfDomainsSchema from "./wrf_domains_schema.vue";

const html = renderDescription(wrfProject.description);
</script>

<template>
  <div>
    <div class="description-body" v-html="html" />
    <figure class="schema-figure">
      <WrfDomainsSchema />
      <figcaption>Three nested domains. Click one to open it.</figcaption>
    </figure>
  </div>
</template>

<style scoped>
.schema-figure {
  margin: 1.5em 0;
}
figcaption {
  margin-top: 0.4em;
  font-size: 0.8em;
  opacity: 0.6;
  text-align: center;
}
</style>
