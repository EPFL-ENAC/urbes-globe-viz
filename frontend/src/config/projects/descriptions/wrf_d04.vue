<!--
  Description component for WRF d04 (Geneva, 333 m).
  Mirrors wrf_d03.vue, reusing the same nested-domains schema with d04
  highlighted instead.
-->
<script setup lang="ts">
import WrfDomainsSchema from "./wrf_domains_schema.vue";
</script>

<template>
  <div>
    <p>
      Companion 333 m field over the Geneva metropolitan area. Running Geneva
      and Lausanne back to back lets <em>URBES</em> compare two lake-side
      agglomerations with distinct densities, green-space distributions, and
      industrial layouts.
    </p>
    <figure class="schema-figure">
      <WrfDomainsSchema highlight="d04" />
      <figcaption>
        d04 covers the Geneva basin at the same 333 m resolution as the sibling
        d03 grid over Lausanne.
      </figcaption>
    </figure>
    <p>
      The Geneva basin is colder than Lausanne on calm winter nights and warmer
      on summer afternoons; running both cities under identical forcing isolates
      how much of that contrast comes from urban form rather than regional
      climate.
    </p>
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
