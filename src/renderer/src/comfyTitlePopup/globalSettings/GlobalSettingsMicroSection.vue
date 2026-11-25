<script setup lang="ts">
import InfoTooltip from '../../components/InfoTooltip.vue'
import { SECTION_TITLE_CLASS } from '../../lib/sectionTitle'
import { useLauncherPrefs, type CustomLauncherSidebarPage } from '../../composables/useLauncherPrefs'

const props = defineProps<{
  title: string
  tooltip?: string
}>()

const { t } = useI18n()
const { sidebarVisibility, setSidebarPageHidden } = useLauncherPrefs()
const sidebarPages: { id: CustomLauncherSidebarPage; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'apps', label: 'Apps' },
  { id: 'assets', label: 'Assets' }
]
</script>

<template>
  <section class="gs-micro-section flex flex-col gap-2">
    <h3 class="gs-micro-title m-0 flex items-center px-0 pt-0 pb-1" :class="SECTION_TITLE_CLASS">
      <span>{{ title }}</span>
      <InfoTooltip v-if="tooltip" :text="tooltip" />
      <div
        v-if="$slots.actions"
        class="gs-micro-actions ml-auto inline-flex items-center gap-2 text-[12px] font-normal tracking-normal text-text-muted normal-case"
      >
        <slot name="actions" />
      </div>
    </h3>
    <div class="gs-micro-body flex flex-col gap-2">
      <slot />
      <div
        v-if="props.title === t('settings.generalSection')"
        class="gs-sidebar-pages flex flex-col gap-2 pt-2"
        data-testid="global-sidebar-page-settings"
      >
        <span class="text-[12px] leading-4 text-text-muted">Sidebar pages</span>
        <label
          v-for="page in sidebarPages"
          :key="page.id"
          class="flex min-h-7 cursor-pointer items-center gap-2 text-[13px]"
        >
          <input
            type="checkbox"
            class="size-4 accent-[var(--action)]"
            :checked="!sidebarVisibility[page.id]"
            :data-testid="`global-sidebar-page-visible-${page.id}`"
            @change="setSidebarPageHidden(page.id, !($event.target as HTMLInputElement).checked)"
          />
          <span>Show {{ page.label }}</span>
        </label>
      </div>
    </div>
  </section>
</template>
