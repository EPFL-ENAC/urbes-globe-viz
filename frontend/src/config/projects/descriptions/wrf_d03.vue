<!--
  Description component for WRF d03 (Lausanne, 333 m).
  Renders the shared nested-domains schema with d03 highlighted, plus prose.
  See wrf_d04.vue for the Geneva sibling that reuses the same schema.
-->
<script setup lang="ts">
import WrfDomainsSchema from "./wrf_domains_schema.vue";
</script>

<template>
  <div>
    <p>
      One-way nested field at 333 m over the Lausanne metropolitan area. The
      finer grid separates individual neighbourhoods from their surrounding
      countryside, giving the spatial detail needed to relate near-surface
      temperatures to urban form.
    </p>
    <figure class="schema-figure">
      <WrfDomainsSchema highlight="d03" />
      <figcaption>
        d03 sits inside the d02 parent domain and shares a timestep with the
        sibling d04 grid over Geneva.
      </figcaption>
    </figure>
    <p>
      Boundary conditions flow in from the 1 km d02 field at the domain edges
      and the 333 m cells are integrated at a shorter timestep, keeping the
      cascade numerically stable from regional circulations down to
      neighbourhood-scale contrasts.
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
