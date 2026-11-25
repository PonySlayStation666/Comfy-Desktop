import { ref } from 'vue'

export type CustomLauncherSidebarVisibility = {
  home: boolean
  apps: boolean
  assets: boolean
}

export type CustomLauncherSidebarPage = keyof CustomLauncherSidebarVisibility

export const CUSTOM_LAUNCHER_DEFAULTS = {
  sidebarCollapsed: true,
  defaultLaunchTab: 'chooser' as const,
  sidebarVisibility: {
    home: false,
    apps: false,
    assets: false
  }
} as const

const HIDDEN_PAGE_KEYS: Record<CustomLauncherSidebarPage, string> = {
  home: 'comfy.desktop.sidebar.hide.home',
  apps: 'comfy.desktop.sidebar.hide.apps',
  assets: 'comfy.desktop.sidebar.hide.assets'
}

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

  for (const [page, key] of Object.entries(HIDDEN_PAGE_KEYS) as [CustomLauncherSidebarPage, string][]) {
    if (readStoredBoolean(key) === null) {
      window.localStorage.setItem(key, String(CUSTOM_LAUNCHER_DEFAULTS.sidebarVisibility[page]))
    }
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
}

initializeCustomLauncherPreferences()

const hiddenSidebarPages = ref<CustomLauncherSidebarVisibility>({
  home: readStoredBoolean(HIDDEN_PAGE_KEYS.home) ?? CUSTOM_LAUNCHER_DEFAULTS.sidebarVisibility.home,
  apps: readStoredBoolean(HIDDEN_PAGE_KEYS.apps) ?? CUSTOM_LAUNCHER_DEFAULTS.sidebarVisibility.apps,
  assets: readStoredBoolean(HIDDEN_PAGE_KEYS.assets) ?? CUSTOM_LAUNCHER_DEFAULTS.sidebarVisibility.assets
})

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    const page = (Object.keys(HIDDEN_PAGE_KEYS) as CustomLauncherSidebarPage[]).find(
      (candidate) => HIDDEN_PAGE_KEYS[candidate] === event.key
    )
    if (!page) return
    hiddenSidebarPages.value = {
      ...hiddenSidebarPages.value,
      [page]: event.newValue === 'true'
    }
  })
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

  function setSidebarPageHidden(page: CustomLauncherSidebarPage, hidden: boolean): void {
    hiddenSidebarPages.value = { ...hiddenSidebarPages.value, [page]: hidden }
    window.localStorage.setItem(HIDDEN_PAGE_KEYS[page], String(hidden))
  }

  return {
    firstUseCompleted,
    loaded,
    loadPrefs,
    markFirstUseCompleted,
    sidebarVisibility: hiddenSidebarPages,
    setSidebarPageHidden,
    defaultLaunchTab: CUSTOM_LAUNCHER_DEFAULTS.defaultLaunchTab
  }
}

export function __resetLauncherPrefsForTest(): void {
  loadPromise = null
  loaded.value = false
  firstUseCompleted.value = false
  hiddenSidebarPages.value = { home: false, apps: false, assets: false }
}
