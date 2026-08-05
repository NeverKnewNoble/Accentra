<script setup>
import { computed } from 'vue'
import SkeletonBlock from './SkeletonBlock.vue'

// A paragraph of placeholder lines. Widths taper so the block reads as prose
// rather than a solid rectangle.
const props = defineProps({
  lines: { type: Number, default: 3 },
})

const WIDTHS = ['w-full', 'w-11/12', 'w-4/5', 'w-10/12', 'w-3/5']

const widths = computed(() =>
  Array.from({ length: Math.max(1, props.lines) }, (_, i) =>
    i === props.lines - 1 ? 'w-2/5' : WIDTHS[i % WIDTHS.length],
  ),
)
</script>

<template>
  <div class="space-y-2.5">
    <SkeletonBlock v-for="(width, i) in widths" :key="i" class="h-3" :class="width" />
  </div>
</template>
