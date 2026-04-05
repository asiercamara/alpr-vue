<template>
  <div class="example-component">
    <h1>{{ message }}</h1>
    <p>Contador: {{ count }}</p>
    <button @click="increment">Incrementar</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Definición de estado reactivo usando Composition API y <script setup>
const message = ref('¡Proyecto Vue 3 inicializado correctamente!')
const count = ref(0)

// Función para incrementar el contador
const increment = () => {
  count.value++
}
</script>

<style scoped>
.example-component {
  padding: 20px;
  text-align: center;
  border: 1px solid #42b883;
  border-radius: 8px;
  margin: 20px;
}

button {
  background-color: #42b883;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

button:hover {
  background-color: #35495e;
}
</style>
