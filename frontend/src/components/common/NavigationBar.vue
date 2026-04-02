<script setup lang="ts">
import { ref } from "vue";
import epflLogo from "@/assets/EPFL_Logo.svg";

const infoOpen = ref(false);
</script>

<template>
  <div class="fixed-top" style="height: 60px; z-index: 1000">
    <div class="row items-center justify-between q-px-lg" style="height: 100%">
      <div class="row items-center q-gutter-sm">
        <img :src="epflLogo" alt="EPFL" style="height: 16px" />
        <q-separator vertical size="1px" color="white" />
        <span class="text-h6 text-white text-weight-bold">URBES</span>
      </div>

      <q-btn
        flat
        round
        color="white"
        icon="info"
        size="md"
        @click="infoOpen = true"
        style="
          border: 1px solid rgba(255, 255, 255, 0.2);
          width: 40px;
          height: 40px;
        "
      />
    </div>
  </div>

  <!-- Info side panel -->
  <teleport to="body">
    <!-- Backdrop -->
    <transition name="fade">
      <div v-if="infoOpen" class="info-backdrop" @click="infoOpen = false" />
    </transition>

    <!-- Panel -->
    <transition name="slide">
      <div v-if="infoOpen" class="info-panel bg-black">
        <q-btn
          flat
          round
          dense
          icon="close"
          color="white"
          class="close-btn"
          @click="infoOpen = false"
        />

        <div class="panel-content">
          <h2 class="text-h6 text-white q-mb-lg">About Urbes Viz</h2>
          <p class="text-body1 text-grey q-mb-md">
            URBES Viz is an interactive visualization platform developed to
            explore and communicate research data from the
            <a href="https://www.epfl.ch/labs/urbes/">URBES lab</a>. This demo
            showcases a 3D globe-based interface offering an immersive,
            multi-scale view of urban building energy research across geographic
            contexts worldwide.
          </p>
          <p class="text-body1 text-grey">
            Built on the design principles, data structures, and user experience
            insights developed through earlier iterations of URBES Viz, this
            application allows users to navigate research projects, datasets,
            and geographic coverage in an interactive global environment — from
            continental overviews down to city-scale detail.
          </p>

          <div class="section-divider" />

          <p class="text-h6 text-white q-mb-xs">How to cite</p>
          <p class="text-body1 text-grey">
            If you use data or visuals from this platform in your work, please
            cite it as follows: ... ?
          </p>

          <div class="section-divider" />

          <p class="text-h6 text-white q-mb-xs">Contributors</p>
          <p class="text-body1 text-grey">
            URBES Viz is developed at EPFL by
            <a href="https://www.epfl.ch/labs/urbes/">URBES lab</a>, with
            technical implementation by
            <a
              href="https://www.epfl.ch/schools/enac/about/data-at-enac/enac-it4research/"
              >ENAC-IT4Research</a
            >'s research software engineers. Contact point: ... ?
          </p>

          <div class="section-divider" />

          <p class="text-h6 text-white q-mb-xs">Suggestions</p>
          <p class="text-body1 text-grey">
            Report bugs and suggestions directly on GitHub.
          </p>

          <div class="section-divider" />

          <p class="text-h6 text-white q-mb-xs">Basemap data</p>
          <p class="text-body1 text-grey">
            GHSL layer data provided by the
            <a href="https://emergency.copernicus.eu/"
              >Copernicus Emergency Management Service</a
            >.
          </p>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style>
.info-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1998;
}

.info-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
  z-index: 1999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid rgba(255, 255, 255, 0.12);
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 32px;
  z-index: 1;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 80px 12% 40px 12%;
  scrollbar-width: none;
}

.panel-content a {
  color: #ffffff;
  text-decoration: underline;
}

.panel-content a:hover {
  color: #ffffff;
  text-decoration: underline;
}

.panel-content::-webkit-scrollbar {
  display: none;
}

.section-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 28px 0;
}

/* Slide from right */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease-out;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

/* Backdrop fade */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Mobile: full width */
@media (max-width: 768px) {
  .info-panel {
    width: 100vw;
  }
}
</style>
