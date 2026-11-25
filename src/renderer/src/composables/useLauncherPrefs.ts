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

function initializeCustomLauncherPreferences(): void {
  if (typeof window === 'undefined') return

  const collapsedKey = 'comfy.desktop.sidebar.collapsed'
  if (readStoredBoolean(collapsedKey) === null) {
    window.localStorage.setItem(collapsedKey, String(CUSTOM_LAUNCHER_DEFAULTS.sidebarCollapsed))
  }

  for (const page of ['home', 'apps', 'assets'] as const) {
    const key = `comfy.desktop.sidebar.hide.${page}`
    if (readStoredBoolean(key) === null) window.localStorage.setItem(key, 'true')
  }

  // A dashboard launch with no explicit page opens Builds by default; preserve explicit page links.
  const params = new URLSearchParams(window.location.search)
  if (params.get('panel') === 'chooser' && !params.has('dashboardPage')) {
    params.set('dashboardPage', CUSTOM_LAUNCHER_DEFAULTS.defaultLaunchTab)
    const query = params.toString()
    const hash = window.location.hash
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${hash}`
    )
  }

  // Hide only the three sidebar navigation rows; page navigation from in-page actions remains intact.
  if (document.head && !document.getElementById('custom-launcher-sidebar-visibility')) {
    const style = document.createElement('style')
    style.id = 'custom-launcher-sidebar-visibility'
    style.textContent = [
      '.app-sidebar nav [data-testid="app-sidebar-home"],',
      '.app-sidebar nav [data-testid="app-sidebar-apps"],',
      '.app-sidebar nav [data-testid="app-sidebar-assets"] { display: none !important; }'
    ].join('\n')
    document.head.append(style)
  }
}

initializeCustomLauncherPreferences()

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
