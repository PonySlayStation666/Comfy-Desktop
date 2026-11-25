import { ref } from 'vue'

export type CustomLauncherSidebarVisibility = {
  home: boolean
  apps: boolean
  assets: boolean
}

export const CUSTOM_LAUNCHER_DEFAULTS = {
  sidebarCollapsed: true,
  defaultLaunchTab: 'chooser' as const,
  sidebarVisibility: {
    home: false,
    apps: false,
    assets: false
  }
} as const

function readStoredBoolean(key: string): boolean | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(key)
  if (value === null) return null
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

// Custom launcher defaults apply only when the user has not already chosen a preference.
if (typeof window !== 'undefined') {
  const sidebarCollapsedKey = 'comfy.desktop.sidebar.collapsed'
  if (readStoredBoolean(sidebarCollapsedKey) === null) {
    window.localStorage.setItem(sidebarCollapsedKey, String(CUSTOM_LAUNCHER_DEFAULTS.sidebarCollapsed))
  }

  for (const page of ['home', 'apps', 'assets'] as const) {
    const key = `comfy.desktop.sidebar.hide.${page}`
    if (readStoredBoolean(key) === null) {
      window.localStorage.setItem(key, 'true')
    }
  }
}

const firstUseCompleted = ref<boolean>(false)
const loaded = ref(false)
let loadPromise: Promise<void> | null = null

export function seedLauncherPrefsFromUrl(search: string): void {
  const value = new URLSearchParams(search).get('firstUseCompleted')
  if (value !== 'true' && value !== 'false') return
  firstUseCompleted.value = value === 'true'
  loaded.value = true
}

export function useLauncherPrefs() {
  async function loadPrefs(): Promise<void> {
    if (loadPromise) return loadPromise
    loadPromise = (async () => {
      const firstUse = await window.api.getSetting('firstUseCompleted')
      firstUseCompleted.value = firstUse === true
      loaded.value = true
    })()
    return loadPromise
  }

  async function markFirstUseCompleted(): Promise<void> {
    if (firstUseCompleted.value) return
    firstUseCompleted.value = true
    await window.api.setSetting('firstUseCompleted', true)
  }

  function sidebarVisibility(): CustomLauncherSidebarVisibility {
    if (typeof window === 'undefined') return { home: false, apps: false, assets: false }
    return {
      home: readStoredBoolean('comfy.desktop.sidebar.hide.home') === true,
      apps: readStoredBoolean('comfy.desktop.sidebar.hide.apps') === true,
      assets: readStoredBoolean('comfy.desktop.sidebar.hide.assets') === true
    }
  }

  return {
    firstUseCompleted,
    loaded,
    loadPrefs,
    markFirstUseCompleted,
    sidebarVisibility,
    defaultLaunchTab: CUSTOM_LAUNCHER_DEFAULTS.defaultLaunchTab
  }
}

export function __resetLauncherPrefsForTest(): void {
  loadPromise = null
  loaded.value = false
  firstUseCompleted.value = false
}
