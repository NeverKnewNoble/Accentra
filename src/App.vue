<template>
  <RouterView v-slot="{ Component }">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
      mode="out-in"
    >
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>
