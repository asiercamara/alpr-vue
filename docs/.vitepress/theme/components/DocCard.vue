<template>
  <component :is="href ? 'a' : 'div'" :href="href" class="doc-card">
    <component :is="iconComponent" v-if="iconComponent" class="doc-card-icon" aria-hidden="true" />
    <div class="doc-card-title">{{ title }}</div>
    <div class="doc-card-body"><slot /></div>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import {
  CameraIcon,
  PhotoIcon,
  VideoCameraIcon,
  ClipboardDocumentCheckIcon,
  RocketLaunchIcon,
  GlobeAltIcon,
  TableCellsIcon,
  Cog6ToothIcon,
  LanguageIcon,
  PencilIcon,
  ShieldCheckIcon,
  AdjustmentsHorizontalIcon,
  SunIcon,
  ArrowUpTrayIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  title: string
  icon?: string
  href?: string
}>()

const iconMap: Record<string, Component> = {
  camera: CameraIcon,
  image: PhotoIcon,
  video: VideoCameraIcon,
  'list-check': ClipboardDocumentCheckIcon,
  rocket: RocketLaunchIcon,
  browser: GlobeAltIcon,
  'file-csv': TableCellsIcon,
  gear: Cog6ToothIcon,
  language: LanguageIcon,
  pen: PencilIcon,
  'shield-halved': ShieldCheckIcon,
  sliders: AdjustmentsHorizontalIcon,
  sun: SunIcon,
  upload: ArrowUpTrayIcon,
}

const iconComponent = computed(() => (props.icon ? iconMap[props.icon] : undefined))
</script>
