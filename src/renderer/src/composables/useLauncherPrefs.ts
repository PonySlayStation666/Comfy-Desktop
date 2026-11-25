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

const LABELS: Record<CustomLauncherSidebarPage, string> = {
  home: 'Home',
  apps: 'Apps',
  assets: 'Assets'
}

export const CUSTOM_LAUNCHER_DEFAULTS = {
  sidebarCollapsed: true,
  defaultLaunchTab: 'chooser' as const,
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
  if (typeof document === 'undefined') return
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

function mountSidebarPreferencesControl(): void {
  if (typeof document === 'undefined') return
  const sidebar = document.querySelector<HTMLElement>('[data-testid="app-sidebar"]')
  const settings = sidebar?.querySelector<HTMLElement>('[data-testid="app-sidebar-settings"]')
  if (!sidebar || !settings || sidebar.querySelector('[data-testid="sidebar-page-preferences"]')) return

  const trigger = document.createElement('button')
  trigger.type = 'button'
  trigger.textContent = 'Sidebar tabs'
  trigger.setAttribute('data-testid', 'sidebar-page-preferences')
  trigger.setAttribute('aria-haspopup', 'dialog')
  trigger.style.cssText =
    'margin:4px 0;padding:7px 10px;border:0;border-radius:8px;background:transparent;color:inherit;text-align:left;cursor:pointer;font:inherit;'
  settings.insertAdjacentElement('afterend', trigger)

  trigger.addEventListener('click', () => {
    document.querySelector('[data-testid="sidebar-page-preferences-dialog"]')?.remove()
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')
    dialog.setAttribute('aria-labelledby', 'sidebar-page-preferences-title')
    dialog.setAttribute('data-testid', 'sidebar-page-preferences-dialog')
    dialog.style.cssText =
      'position:fixed;z-index:99999;left:24px;bottom:24px;width:280px;padding:18px;border:1px solid #444;border-radius:12px;background:#202020;color:#fff;box-shadow:0 12px 40px #0009;font:14px sans-serif;'

    const title = document.createElement('h2')
    title.id = 'sidebar-page-preferences-title'
    title.textContent = 'Sidebar tabs'
    title.style.cssText = 'margin:0 0 14px;font-size:16px;'
    dialog.append(title)

    for (const page of Object.keys(HIDDEN_PAGE_KEYS) as CustomLauncherSidebarPage[]) {
      const label = document.createElement('label')
      label.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 0;cursor:pointer;'
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.checked = !hiddenSidebarPages.value[page]
      checkbox.setAttribute('data-testid', `sidebar-page-visible-${page}`)
      checkbox.addEventListener('change', () => setSidebarPageHidden(page, !checkbox.checked))
      const text = document.createElement('span')
      text.textContent = `Show ${LABELS[page]}`
      label.append(checkbox, text)
      dialog.append(label)
    }

    const close = document.createElement('button')
    close.type = 'button'
    close.textContent = 'Done'
    close.style.cssText =
      'margin-top:12px;padding:7px 12px;border:0;border-radius:7px;background:#444;color:inherit;cursor:pointer;'
    close.addEventListener('click', () => dialog.remove())
    dialog.append(close)
    document.body.append(dialog)
    close.focus()
  })
}

if (typeof window !== 'undefined') {
  applySidebarVisibility()
  const observer = new MutationObserver(() => {
    applySidebarVisibility()
    mountSidebarPreferencesControl()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
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
  hiddenSidebarPages.value = { home: false, apps: false, assets: false }
}
