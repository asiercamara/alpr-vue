<script setup>
defineProps({
  msg: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <div class="greetings">
    <h1 class="greeting-title">{{ msg }}</h1>
    <h3 class="greeting-subtitle">
      You’ve successfully created a project with
      <a href="https://vite.dev/" target="_blank" rel="noopener">Vite</a> +
      <a href="https://vuejs.org/" target="_blank" rel="noopener">Vue 3</a>.
    </h3>
  </div>
</template>

<style scoped>
.greeting-title {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
  top: -10px;
}

.greeting-subtitle {
  font-size: 1.2rem;
}

.greetings .greeting-title,
.greetings .greeting-subtitle {
  text-align: center;
}

@media (min-width: 1024px) {
  .greetings .greeting-title,
  .greetings .greeting-subtitle {
    text-align: left;
  }
}
</style>
