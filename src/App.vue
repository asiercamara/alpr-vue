<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow-sm py-4 px-6 mb-6">
      <div class="max-w-5xl mx-auto flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div class="bg-blue-600 p-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white tracking-tight">ALPR Vue</h1>
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400 font-medium">
          Sistema de Reconocimiento de Matrículas
        </div>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 pb-12">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Main Camera Section -->
        <div class="lg:col-span-2 space-y-6">
          <CameraPreview />
          
          <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-3 text-center">Instrucciones de uso</h2>
            <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li class="flex items-start gap-2">
                <span class="text-blue-500">•</span>
                <span>Activa la cámara para comenzar el escaneo en tiempo real.</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-blue-500">•</span>
                <span>Apunta la cámara directamente a la matrícula del vehículo.</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-blue-500">•</span>
                <span>El sistema detectará automáticamente el texto y lo guardará en el historial.</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Sidebar / History Section -->
        <div class="lg:col-span-1">
          <PlateList />
        </div>

      </div>
    </main>
  </div>
</template>

<script setup>
import CameraPreview from '@/components/ui/CameraPreview.vue'
import PlateList from '@/components/ui/PlateList.vue'
</script>

<style>
/* Global styles for the app */
body {
  margin: 0;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
</style>
