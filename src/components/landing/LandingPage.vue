<script setup>
import DetailsSection from './DetailsSection.vue'
import HeroSection from './HeroSection.vue'
import TheFooter from './TheFooter.vue'
import TheNavbar from './TheNavbar.vue'
</script>

<template>
  <div class="min-h-screen bg-white">
    <TheNavbar />
    <main>
      <HeroSection />
      <DetailsSection />
    </main>
    <TheFooter />
  </div>
</template>
