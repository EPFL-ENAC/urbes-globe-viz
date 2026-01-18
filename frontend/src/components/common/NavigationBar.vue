<script setup lang="ts">
import epflLogo from '@/assets/EPFL_Logo.svg';
</script>

<template>
  <div class="fixed-top" style="height: 60px; z-index: 1000">
    <div class="row items-center justify-between q-px-lg" style="height: 100%">
      <div class="row items-center q-gutter-sm">
        <img :src="epflLogo" alt="EPFL" style="height: 24px" />
        <span class="text-h6 text-white text-weight-bold">URBES</span>
      </div>
      
      <div class="row q-gutter-md">
        <a href="#" class="nav-link text-white text-body1">About</a>
        <a href="#" class="nav-link text-white text-body1">Contact</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nav-link {
  text-decoration: none;
  transition: text-decoration 0.2s;
}

.nav-link:hover {
  text-decoration: underline;
}
</style>
