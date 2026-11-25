<script setup lang="ts">
import SidebarWorkspaceSwitcher from './SidebarWorkspaceSwitcher.vue'
import { useAuthStore } from '../stores/authStore'
import { useDashboardScopeStore } from '../stores/dashboardScopeStore'

defineProps<{
  collapsed: boolean
}>()

const store = useAuthStore()
const dashboardScope = useDashboardScopeStore()
void dashboardScope.initialize()
</script>

<template>
  <div class="sidebar-account">
    <SidebarWorkspaceSwitcher v-if="store.isSignedIn" :collapsed="collapsed" />
  </div>
</template>
