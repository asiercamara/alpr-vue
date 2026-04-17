<template>
  <div v-if="frontmatter.title" class="doc-page-header">
    <h1 class="doc-page-title">{{ frontmatter.title }}</h1>
    <p v-if="frontmatter.description" class="doc-page-description">
      {{ frontmatter.description }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useData } from 'vitepress'
const { frontmatter } = useData()
</script>
