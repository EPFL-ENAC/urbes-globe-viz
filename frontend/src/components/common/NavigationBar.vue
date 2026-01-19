<script setup lang="ts">
import epflLogo from "@/assets/EPFL_Logo.svg";
</script>

<template>
  <div class="fixed-top" style="height: 60px; z-index: 1000">
    <div class="row items-center justify-between q-px-lg" style="height: 100%">
      <div class="row items-center q-gutter-sm">
        <img :src="epflLogo" alt="EPFL" style="height: 16px" />
        <q-separator vertical size="1px" color="white" />
        <span class="text-h6 text-white text-weight-bold">URBES</span>
      </div>

      <div class="row q-gutter-md">
        <q-btn flat no-caps color="white" label="About" href="#" />
        <q-btn flat no-caps color="white" label="Contact" href="#" />
      </div>
    </div>
  </div>
</template>
