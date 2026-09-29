<!--
  Description component for WRF d02 (Leman region, 1 km).
  Renders the shared nested-domains schema with the d02 parent highlighted,
  plus prose. See wrf_d03.vue and wrf_d04.vue for the two child domains.
-->
<script setup lang="ts">
import WrfDomainsSchema from "./wrf_domains_schema.vue";
</script>

<template>
  <div>
    <p>
      Regional mesoscale WRF simulation output at 1 km over the Leman basin,
      resolving lake breezes, valley circulations, and the combined urban
      footprint of Lausanne and Geneva.
    </p>
    <figure class="schema-figure">
      <WrfDomainsSchema highlight="d02" />
      <figcaption>
        d02 is the parent domain of the two 333 m grids over Lausanne (d03) and
        Geneva (d04).
      </figcaption>
    </figure>
    <p>
      At this scale the model captures the circulations that shape the whole
      basin, like the exchange between the lake and the land. The 1 km field
      then drives the two child domains through their edges (one-way nesting),
      so the neighbourhood-scale runs stay consistent with the regional weather.
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
