import { ref } from 'vue'

export type CustomLauncherSidebarVisibility = {
  home: boolean
  apps: boolean
  assets: boolean
}

export type CustomLauncherSidebarPage = keyof CustomLauncherSidebarVisibility

const HIDDEN_PAGE_KEYS: Record<CustomLauncherSidebarPage, string> = {
  home: 'comfy.desktop.sidebar.hide.home',
  apps: 'comfy.desktop.sidebar.hide.apps',
  assets: 'comfy.desktop.sidebar.hide.assets'
}

export const CUSTOM_LAUNCHER_DEFAULTS = {
  sidebarCollapsed: true,
  defaultLaunchTab: 'chooser' as const,
  // These values represent hidden state. Preserve the original hidden-by-default behavior.
  sidebarVisibility: { home: true, apps: true, assets: true }
} as const

function readStoredBoolean(key: string): boolean | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(key)
    if (value === 'true') return true
    if (value === 'false') return false
  } catch {}
  return null
}

function initializeCustomLauncherPreferences(): void {
  if (typeof window === 'undefined') return

  const collapsedKey = 'comfy.desktop.sidebar.collapsed'
  if (readStoredBoolean(collapsedKey) === null) {
    try {
      window.localStorage.setItem(collapsedKey, String(CUSTOM_LAUNCHER_DEFAULTS.sidebarCollapsed))
    } catch {}
  }
  for (const [page, key] of Object.entries(HIDDEN_PAGE_KEYS) as [CustomLauncherSidebarPage, string][]) {
    if (readStoredBoolean(key) === null) {
      try {
        window.localStorage.setItem(key, String(CUSTOM_LAUNCHER_DEFAULTS.sidebarVisibility[page]))
      } catch {}
    }
  }

  // A dashboard launch with no explicit page opens Builds by default; preserve explicit page links.
  const params = new URLSearchParams(window.location.search)
  if (params.get('panel') === 'chooser' && !params.has('dashboardPage')) {
    params.set('dashboardPage', CUSTOM_LAUNCHER_DEFAULTS.defaultLaunchTab)
    const query = params.toString()
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    )
  }
}

initializeCustomLauncherPreferences()

const hiddenSidebarPages = ref<CustomLauncherSidebarVisibility>({
  home: readStoredBoolean(HIDDEN_PAGE_KEYS.home) ?? CUSTOM_LAUNCHER_DEFAULTS.sidebarVisibility.home,
  apps: readStoredBoolean(HIDDEN_PAGE_KEYS.apps) ?? CUSTOM_LAUNCHER_DEFAULTS.sidebarVisibility.apps,
  assets: readStoredBoolean(HIDDEN_PAGE_KEYS.assets) ?? CUSTOM_LAUNCHER_DEFAULTS.sidebarVisibility.assets
})

function applySidebarVisibility(): void {
  if (typeof document === 'undefined' || !document.head) return
  let style = document.getElementById('custom-launcher-sidebar-visibility') as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = 'custom-launcher-sidebar-visibility'
    document.head.append(style)
  }
  style.textContent = (Object.keys(HIDDEN_PAGE_KEYS) as CustomLauncherSidebarPage[])
    .filter((page) => hiddenSidebarPages.value[page])
    .map((page) => `.app-sidebar [data-testid="app-sidebar-${page}"] { display: none !important; }`)
    .join('\n')
}

function setSidebarPageHidden(page: CustomLauncherSidebarPage, hidden: boolean): void {
  hiddenSidebarPages.value = { ...hiddenSidebarPages.value, [page]: hidden }
  try {
    window.localStorage.setItem(HIDDEN_PAGE_KEYS[page], String(hidden))
  } catch {}
  applySidebarVisibility()
}

if (typeof window !== 'undefined') {
  applySidebarVisibility()
  window.addEventListener('storage', (event) => {
    const page = (Object.keys(HIDDEN_PAGE_KEYS) as CustomLauncherSidebarPage[]).find(
      (candidate) => HIDDEN_PAGE_KEYS[candidate] === event.key
    )
    if (!page) return
    hiddenSidebarPages.value = {
      ...hiddenSidebarPages.value,
      [page]: event.newValue === 'true'
    }
    applySidebarVisibility()
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
  hiddenSidebarPages.value = { ...CUSTOM_LAUNCHER_DEFAULTS.sidebarVisibility }
}
