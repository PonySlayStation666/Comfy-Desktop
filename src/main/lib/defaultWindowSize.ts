import { screen } from 'electron'

export interface WorkArea {
  x: number
  y: number
  width: number
  height: number
}

export interface DefaultWindowBounds extends WorkArea {
  maximize: boolean
}

export const SHARE_OF_WORK_AREA = 0.85
export const MIN_DEFAULT_WIDTH = 1024
export const MIN_DEFAULT_HEIGHT = 700
export const MAX_DEFAULT_WIDTH = 2400
export const MAX_DEFAULT_HEIGHT = 1500
export const MAXIMIZE_BELOW_WIDTH = 1600
export const MAXIMIZE_BELOW_HEIGHT = 900
export const MIN_WINDOW_WIDTH = 800
export const MIN_WINDOW_HEIGHT = 600
export const DEFAULT_WINDOW_WIDTH = 1200
export const DEFAULT_WINDOW_HEIGHT = 800

export interface FittedWindow extends WorkArea {
  minWidth: number
  minHeight: number
}

export function defaultWindowBounds(workArea: WorkArea): DefaultWindowBounds {
  const width = Math.min(DEFAULT_WINDOW_WIDTH, workArea.width)
  const height = Math.min(DEFAULT_WINDOW_HEIGHT, workArea.height)
  return {
    x: workArea.x + Math.round((workArea.width - width) / 2),
    y: workArea.y + Math.round((workArea.height - height) / 2),
    width,
    height,
    maximize: false
  }
}

export interface FreshWindowBounds extends DefaultWindowBounds {
  workArea: WorkArea
}

export function defaultWindowBoundsNear(point: Electron.Point): FreshWindowBounds {
  const { workArea } = screen.getDisplayNearestPoint(point)
  return { ...defaultWindowBounds(workArea), workArea }
}

export function defaultWindowBoundsMatching(bounds: Electron.Rectangle): FreshWindowBounds {
  const { workArea } = screen.getDisplayMatching(bounds)
  return { ...defaultWindowBounds(workArea), workArea }
}

export function defaultWindowBoundsUnderCursor(): FreshWindowBounds {
  return defaultWindowBoundsNear(screen.getCursorScreenPoint())
}

export function fitWindowToWorkArea(bounds: WorkArea, workArea: WorkArea): FittedWindow {
  const width = Math.min(bounds.width, workArea.width)
  const height = Math.min(bounds.height, workArea.height)
  return {
    x: Math.max(workArea.x, Math.min(bounds.x, workArea.x + workArea.width - width)),
    y: Math.max(workArea.y, Math.min(bounds.y, workArea.y + workArea.height - height)),
    width,
    height,
    minWidth: Math.min(MIN_WINDOW_WIDTH, workArea.width),
    minHeight: Math.min(MIN_WINDOW_HEIGHT, workArea.height)
  }
}

export function fitWindowToDisplay(bounds: WorkArea): FittedWindow {
  return fitWindowToWorkArea(bounds, screen.getDisplayMatching(bounds).workArea)
}
